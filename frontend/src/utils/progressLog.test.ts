import { expect, it } from 'vitest';
import { mergeLogRows } from './progressLog';
it('updates progress when the cursor has not advanced', () => {
  expect(mergeLogRows(['start', '10%'], 2,
    { lines: ['20%'], next: 2, replace_from: 1 })).toEqual(['start', '20%']);
});
it('keeps normal logs across polling boundaries', () => {
  expect(mergeLogRows(['start', '10%'], 2,
    { lines: ['100%', 'validation'], next: 3, replace_from: 1 }))
    .toEqual(['start', '100%', 'validation']);
});
