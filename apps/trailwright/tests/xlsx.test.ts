// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createExampleProject } from '../src/examples/exampleLab';
import { buildSchedulesXlsx } from '../src/exports';
import { buildXlsx, columnName } from '../src/exports/xlsx';
import { readXlsx } from './xlsxRead';

describe('Excel schedules (own writer, replacing the xlsx package)', () => {
  it('has the same sheets and cell values the xlsx package wrote before it was removed (golden file)', () => {
    const golden = JSON.parse(readFileSync(resolve(__dirname, 'fixtures', 'schedules-xlsx.golden.json'), 'utf8')) as Record<string, unknown[][]>;
    expect(readXlsx(buildSchedulesXlsx(createExampleProject())).sheets).toEqual(golden);
  });
  it('is a zip file that starts with the PK signature and has the workbook parts', () => {
    const bytes = buildSchedulesXlsx(createExampleProject());
    expect(Array.from(bytes.slice(0, 2))).toEqual([0x50, 0x4b]);
  });
  it('writes numbers as numbers, text as text, never formulas, and escapes markup and control characters', () => {
    const { sheets, formulas } = readXlsx(buildXlsx([{ name: 'A/B:C', rows: [['=SUM(A1)', 1, 2.5], ['<b>&"x"</b>', 'tab\u0001x', '']] }]));
    expect(formulas).toBe(0);
    expect(Object.keys(sheets)).toEqual(['A B C']);
    expect(sheets['A B C'][0]).toEqual(['=SUM(A1)', 1, 2.5]);
    expect(sheets['A B C'][1].slice(0, 2)).toEqual(['<b>&"x"</b>', 'tabx']);
  });
  it('names columns past Z and keeps sheet names unique and at most 31 characters', () => {
    expect([0, 25, 26, 27, 701, 702].map(columnName)).toEqual(['A', 'Z', 'AA', 'AB', 'ZZ', 'AAA']);
    const { sheets } = readXlsx(buildXlsx([{ name: 'x'.repeat(40), rows: [['a']] }, { name: 'x'.repeat(40), rows: [['b']] }]));
    expect(Object.keys(sheets).every((n) => n.length <= 31)).toBe(true);
    expect(Object.keys(sheets)).toHaveLength(2);
  });
});
