import {
  appendContactNote,
  contactNotesToPlainText,
  deserializeContactNotes,
  serializeContactNotes,
} from './contact-notes.utils';

describe('contact notes utils', () => {
  it('reads legacy plain-text notes as a single imported timeline entry', () => {
    const notes = deserializeContactNotes('Called client about unit 204');

    expect(notes).toHaveLength(1);
    expect(notes[0].body).toBe('Called client about unit 204');
    expect(notes[0].createdAt).toBe('');
  });

  it('serializes and deserializes timestamped timeline notes', () => {
    const raw = serializeContactNotes([
      { id: 'n1', body: 'Sent contract', createdAt: '2026-04-03T10:15:00.000Z' },
      { id: 'n2', body: 'Followed up by phone', createdAt: '2026-04-05T08:00:00.000Z' },
    ]);

    expect(deserializeContactNotes(raw)).toEqual([
      { id: 'n2', body: 'Followed up by phone', createdAt: '2026-04-05T08:00:00.000Z' },
      { id: 'n1', body: 'Sent contract', createdAt: '2026-04-03T10:15:00.000Z' },
    ]);
  });

  it('appends new notes to the top of the timeline and flattens them for export/search', () => {
    const notes = appendContactNote(
      [{ id: 'n1', body: 'Called client', createdAt: '2026-04-01T09:00:00.000Z' }],
      'Sent contract',
      '2026-04-03T14:30:00.000Z',
    );

    expect(notes.map(note => note.body)).toEqual(['Sent contract', 'Called client']);
    expect(contactNotesToPlainText(notes)).toBe(
      '[2026-04-03] Sent contract\n[2026-04-01] Called client'
    );
  });
});
