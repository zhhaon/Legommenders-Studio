import { describe, expect, it } from 'vitest';
import { datasetColumnLabel, datasetInputRows } from './datasetInputRows';

describe('shared dataset input display rows', () => {
  const defaults = [{ column: 'title@bert', truncate: 30 }, { column: 'category', truncate: null }];
  it('resolves dataset defaults instead of displaying a null override', () => {
    expect(datasetInputRows(null, defaults, ['title@bert', 'category'])).toEqual(defaults);
    expect(datasetColumnLabel('title@bert')).toBe('title');
  });
  it('preserves saved column order and truncation while matching current tokenizer column IDs', () => {
    const custom = [{ column: 'category', truncate: null }, { column: 'title@glove', truncate: 12 }];
    expect(datasetInputRows(custom, defaults, ['title@bert', 'category'])).toEqual([
      { column: 'category', truncate: null }, { column: 'title@bert', truncate: 12 },
    ]);
    expect(custom[1].column).toBe('title@glove');
  });
});
