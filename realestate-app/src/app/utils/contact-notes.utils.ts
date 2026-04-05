import { ContactNote } from '../models/contact-note.model';

interface SerializedContactNotes {
  version: number;
  entries: ContactNote[];
}

const NOTES_VERSION = 1;

export function deserializeContactNotes(value: unknown): ContactNote[] {
  if (Array.isArray(value)) {
    return normalizeContactNotes(value);
  }

  if (typeof value !== 'string') {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed) as SerializedContactNotes | ContactNote[];
    if (Array.isArray(parsed)) {
      return normalizeContactNotes(parsed);
    }
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.entries)) {
      return normalizeContactNotes(parsed.entries);
    }
  } catch {
    return normalizeContactNotes([
      {
        id: createNoteId('legacy'),
        body: trimmed,
        createdAt: '',
      },
    ]);
  }

  return [];
}

export function serializeContactNotes(notes: ContactNote[]): string {
  const normalized = normalizeContactNotes(notes);
  if (!normalized.length) {
    return '';
  }

  return JSON.stringify({
    version: NOTES_VERSION,
    entries: normalized,
  } satisfies SerializedContactNotes);
}

export function normalizeContactNotes(notes: unknown[]): ContactNote[] {
  return [...notes]
    .map(note => normalizeContactNote(note))
    .filter((note): note is ContactNote => note !== null)
    .sort(compareContactNotes);
}

export function appendContactNote(notes: ContactNote[], body: string, createdAt = new Date().toISOString()): ContactNote[] {
  const trimmed = normalizeNoteBody(body);
  if (!trimmed) {
    return normalizeContactNotes(notes);
  }

  return normalizeContactNotes([
    {
      id: createNoteId(createdAt),
      body: trimmed,
      createdAt,
    },
    ...notes,
  ]);
}

export function contactNotesToPlainText(notes: ContactNote[]): string {
  return normalizeContactNotes(notes)
    .map(note => note.createdAt ? `[${note.createdAt.slice(0, 10)}] ${note.body}` : note.body)
    .join('\n');
}

function normalizeContactNote(value: unknown): ContactNote | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const note = value as Partial<ContactNote>;
  const body = normalizeNoteBody(note.body);
  if (!body) {
    return null;
  }

  return {
    id: typeof note.id === 'string' && note.id.trim() ? note.id : createNoteId(note.createdAt),
    body,
    createdAt: normalizeDate(note.createdAt),
  };
}

function normalizeDate(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    return '';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function normalizeNoteBody(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().replace(/\r\n/g, '\n');
}

function compareContactNotes(left: ContactNote, right: ContactNote): number {
  if (left.createdAt && right.createdAt && left.createdAt !== right.createdAt) {
    return right.createdAt.localeCompare(left.createdAt);
  }
  if (left.createdAt && !right.createdAt) return -1;
  if (!left.createdAt && right.createdAt) return 1;
  return left.body.localeCompare(right.body, undefined, { sensitivity: 'base' });
}

function createNoteId(seed?: unknown): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const normalizedSeed = typeof seed === 'string' && seed ? seed : String(Date.now());
  return `note-${normalizedSeed.replace(/[^a-zA-Z0-9]+/g, '-').slice(0, 24)}`;
}
