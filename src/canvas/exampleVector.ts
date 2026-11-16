/** Stable display examples keyed by the branch, independent of layout and edits. */
export function exampleItemVector(key: string): string[] {
  let seed = 2166136261;
  for (const char of key) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
  return Array.from({ length: 4 }, () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const value = (seed % 1801 - 900) / 1000;
    return value.toFixed(3).replace('-', '−');
  });
}
