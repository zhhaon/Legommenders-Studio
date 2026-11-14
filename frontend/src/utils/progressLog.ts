export function mergeLogRows(previous: string[], cursor: number, response: {
  lines: string[]; next: number; replace_from?: number;
}): string[] {
  const from = response.replace_from ?? cursor;
  const keep = Math.max(0, previous.length - Math.max(0, cursor - from));
  return [...previous.slice(0, keep), ...response.lines].slice(-4000);
}
