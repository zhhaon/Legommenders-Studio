import { expect, it } from 'vitest';
import { exampleItemVector } from './exampleVector';
it('gives history and candidate branches different stable example vectors', () => {
  const keys = ['h1', 'h2', 'hN', 'positive', 'negative1', 'negativeN'];
  const vectors = keys.map(exampleItemVector);
  expect(new Set(vectors.map(v => v.join(','))).size).toBe(keys.length);
  keys.forEach((key, i) => expect(exampleItemVector(key)).toEqual(vectors[i]));
});
