import { applySearch, exportToCsv } from './csv.utils';

describe('csv utils', () => {
  it('filters across fields using every search term case-insensitively', () => {
    const rows = [
      {
        name: 'Anna Stone',
        status: 'active',
        building: 'Palm Tower',
        notes: [{ body: 'Called about unit 204', createdAt: '2026-04-03T09:00:00.000Z' }],
      },
      { name: 'Boris Lake', status: 'inactive', building: 'River Park' },
      { name: 'Clara Moss', status: 'active', building: 'River Park' },
    ];

    expect(applySearch(rows, 'clara river')).toEqual([
      { name: 'Clara Moss', status: 'active', building: 'River Park' },
    ]);
    expect(applySearch(rows, 'called 204')).toEqual([
      {
        name: 'Anna Stone',
        status: 'active',
        building: 'Palm Tower',
        notes: [{ body: 'Called about unit 204', createdAt: '2026-04-03T09:00:00.000Z' }],
      },
    ]);
    expect(applySearch(rows, '   ')).toBe(rows);
  });

  it('exports csv rows without the id column and escapes special characters', async () => {
    let capturedBlob: Blob | undefined;
    const click = vi.fn();
    const anchor = { href: '', download: '', click } as unknown as HTMLAnchorElement;
    const originalCreateElement = document.createElement.bind(document);

    vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => {
      capturedBlob = blob;
      return 'blob:test';
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(document, 'createElement').mockImplementation(tagName => {
      if (tagName === 'a') return anchor;
      return originalCreateElement(tagName);
    });

    exportToCsv('clients.csv', [
      { id: '1', name: 'Anna "A"', notes: 'Line 1\nLine 2', city: 'Nicosia, CY' },
    ]);

    expect(anchor.href).toBe('blob:test');
    expect(anchor.download).toBe('clients.csv');
    expect(click).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
    expect(await capturedBlob?.text()).toBe(
      'name,notes,city\n"Anna ""A""","Line 1\nLine 2","Nicosia, CY"'
    );
  });

  it('does nothing when there are no rows to export', () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL');

    exportToCsv('clients.csv', []);

    expect(createObjectURL).not.toHaveBeenCalled();
  });
});
