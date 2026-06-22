// Supabase Edge Function MVP: parse freeform text into task draft fields.
// Deploy with: supabase functions deploy task-parser
// Set secrets:
//   supabase secrets set OPENAI_API_KEY=...
// Optional:
//   supabase secrets set OPENAI_MODEL=gpt-4o-mini
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')?.trim() ?? '';
const OPENAI_MODEL = Deno.env.get('OPENAI_MODEL')?.trim() || 'gpt-4o-mini';
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
  }

  const { text, mode } = await req.json().catch(() => ({ text: '', mode: 'parse' }));
  const input = String(text ?? '').trim();
  const requestMode = String(mode ?? 'parse').trim();

  if (!input) {
    return Response.json({ error: 'Text is required.' }, { status: 400, headers: CORS_HEADERS });
  }

  if (requestMode === 'short_title') {
    console.info('[task-parser] short_title request received', {
      inputLength: input.length,
    });
    return await summarizeShortTitle(input);
  }

  const lower = input.toLowerCase();
  const priority = /urgent|asap|immediately/.test(lower)
    ? 'urgent'
    : /important|critical|high/.test(lower)
      ? 'high'
      : 'medium';

  const title = input.split(/[,.]/)[0]?.trim().slice(0, 90) || 'Follow up';

  return Response.json({
    title,
    description: input,
    priority,
    status: 'inbox',
    source: 'ai',
  }, { headers: CORS_HEADERS });
});

async function summarizeShortTitle(text: string): Promise<Response> {
  if (!OPENAI_API_KEY) {
    console.warn('[task-parser] OPENAI_API_KEY is not configured');
    return Response.json(
      { error: 'OPENAI_API_KEY is not configured.' },
      { status: 503, headers: CORS_HEADERS },
    );
  }

  console.info('[task-parser] calling OpenAI for short title', {
    model: OPENAI_MODEL,
    textLength: text.length,
  });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: 'Summarize the task into a short clear title. Return only the title, no quotes, no bullets, no explanation. Keep it concise and useful.',
        },
        {
          role: 'user',
          content: text,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    console.warn('[task-parser] OpenAI request failed', {
      status: response.status,
    });
    return Response.json(
      { error: 'OpenAI request failed.', details: errorText.slice(0, 500) },
      { status: 502, headers: CORS_HEADERS },
    );
  }

  const payload = await response.json() as {
    choices?: Array<{
      message?: {
        content?: string | null;
      };
    }>;
  };

  const shortTitle = payload.choices?.[0]?.message?.content?.trim().replace(/\s+/g, ' ') ?? '';
  if (!shortTitle) {
    console.warn('[task-parser] OpenAI returned an empty short title');
    return Response.json({ error: 'OpenAI did not return a title.' }, { status: 502, headers: CORS_HEADERS });
  }

  console.info('[task-parser] OpenAI short title generated', {
    shortTitle,
  });

  return Response.json({ shortTitle }, { headers: CORS_HEADERS });
}
