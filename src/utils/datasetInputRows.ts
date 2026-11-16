import type { DatasetInput } from '@/types/graph';

export function datasetInputRows(
  inputs: DatasetInput[] | null | undefined, defaults: DatasetInput[], columns: string[],
): DatasetInput[] {
  return (inputs ?? defaults).map(row => {
    const base = row.column.split('@')[0];
    const column = defaults.find(entry => entry.column.split('@')[0] === base)?.column
      ?? columns.find(entry => entry.split('@')[0] === base) ?? row.column;
    return { ...row, column };
  });
}

export function datasetColumnLabel(column: string): string {
  return column.replace(/@[^ ]+/g, '');
}
