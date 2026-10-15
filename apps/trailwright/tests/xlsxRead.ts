import { strFromU8, unzipSync } from 'fflate';

// Reads back the workbooks written by src/exports/xlsx.ts (inline strings and numbers) for the parity tests.
export function readXlsx(bytes: Uint8Array): { sheets: Record<string, (string | number)[][]>; formulas: number } {
  const files = unzipSync(bytes);
  const parse = (name: string): Document => new DOMParser().parseFromString(strFromU8(files[name]), 'application/xml');
  const wb = parse('xl/workbook.xml');
  const sheets: Record<string, (string | number)[][]> = {};
  let formulas = 0;
  Array.from(wb.getElementsByTagName('sheet')).forEach((sheet, i) => {
    const doc = parse(`xl/worksheets/sheet${i + 1}.xml`);
    formulas += doc.getElementsByTagName('f').length;
    sheets[sheet.getAttribute('name') ?? `Sheet${i + 1}`] = Array.from(doc.getElementsByTagName('row')).map((row) =>
      Array.from(row.getElementsByTagName('c')).map((c) => (c.getAttribute('t') === 'inlineStr' ? (c.getElementsByTagName('t')[0]?.textContent ?? '') : Number(c.getElementsByTagName('v')[0]?.textContent))),
    );
  });
  return { sheets, formulas };
}
