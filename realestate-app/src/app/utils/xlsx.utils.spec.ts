import * as XLSX from 'xlsx';
import { exportToXlsx } from './xlsx.utils';

vi.mock('xlsx', () => {
  const json_to_sheet = vi.fn(() => ({ ws: true }));
  const book_new = vi.fn(() => ({ wb: true }));
  const book_append_sheet = vi.fn();
  const writeFile = vi.fn();

  return {
    utils: { json_to_sheet, book_new, book_append_sheet },
    writeFile,
  };
});

describe('xlsx utils', () => {
  it('exports rows without the id field', () => {
    exportToXlsx('clients.xlsx', [
      { id: '1', name: 'Anna', dealValue: 120000 },
      { id: '2', name: 'Boris', dealValue: 90000 },
    ]);

    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith([
      { name: 'Anna', dealValue: 120000 },
      { name: 'Boris', dealValue: 90000 },
    ]);
    expect(XLSX.utils.book_new).toHaveBeenCalledTimes(1);
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith({ wb: true }, { ws: true }, 'Data');
    expect(XLSX.writeFile).toHaveBeenCalledWith({ wb: true }, 'clients.xlsx');
  });

  it('skips workbook creation when there are no rows', () => {
    exportToXlsx('clients.xlsx', []);

    expect(XLSX.utils.json_to_sheet).not.toHaveBeenCalled();
    expect(XLSX.writeFile).not.toHaveBeenCalled();
  });
});
