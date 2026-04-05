import { openPrintableDocument, renderPrintableDocumentHtml } from './pdf.utils';

describe('pdf utils', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders printable HTML with metadata, fields, notes, and table rows', () => {
    const html = renderPrintableDocumentHtml({
      title: 'Client Summary - Anna Stone',
      subtitle: 'Palm Tower / Unit 204',
      meta: [{ label: 'Generated', value: '5 Apr 2026, 20:00' }],
      sections: [
        {
          title: 'Contact',
          fields: [{ label: 'Phone', value: '+357-111-222' }],
        },
        {
          title: 'Notes',
          notes: [{ meta: '5 Apr 2026', body: 'Sent contract' }],
        },
        {
          title: 'Units',
          table: {
            headers: ['Unit', 'Client'],
            rows: [['204', 'Anna Stone']],
          },
        },
      ],
    });

    expect(html).toContain('Client Summary - Anna Stone');
    expect(html).toContain('Palm Tower / Unit 204');
    expect(html).toContain('Generated');
    expect(html).toContain('Sent contract');
    expect(html).toContain('<th>Unit</th>');
    expect(html).toContain('<td>Anna Stone</td>');
  });

  it('opens a print window and triggers print after rendering the document', () => {
    vi.useFakeTimers();

    const fakeWindow = {
      document: {
        open: vi.fn(),
        write: vi.fn(),
        close: vi.fn(),
      },
      focus: vi.fn(),
      print: vi.fn(),
      close: vi.fn(),
      onafterprint: null as (() => void) | null,
    };

    vi.spyOn(window, 'open').mockReturnValue(fakeWindow as unknown as Window);

    const result = openPrintableDocument({
      title: 'Property Sheet - River Park',
      sections: [{ title: 'Overview', fields: [{ label: 'Building', value: 'River Park' }] }],
    });

    expect(result).toBe(true);
    expect(fakeWindow.document.open).toHaveBeenCalledTimes(1);
    expect(fakeWindow.document.write).toHaveBeenCalledTimes(1);
    expect(fakeWindow.document.close).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(120);

    expect(fakeWindow.focus).toHaveBeenCalledTimes(1);
    expect(fakeWindow.print).toHaveBeenCalledTimes(1);
  });

  it('returns false when the browser blocks the popup', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);

    expect(openPrintableDocument({ title: 'Blocked', sections: [] })).toBe(false);
  });
});
