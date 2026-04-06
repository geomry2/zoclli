// Supabase Edge Function MVP: parse freeform text into task draft fields.
// Deploy with: supabase functions deploy task-parser
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

serve(async req => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { text } = await req.json().catch(() => ({ text: '' }));
  const input = String(text ?? '').trim();

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
  });
});
