import { expect, it } from 'vitest';
import { accumulationSteps } from './batchSize';

it('maps global and micro batch sizes to the trainer accumulation steps', () => {
  expect(accumulationSteps('256', '32')).toBe(8);
  expect(accumulationSteps('64', '64')).toBe(1);
  expect(accumulationSteps('16777216', '4096')).toBe(4096);
});

it('rejects batches that cannot be represented exactly by the trainer', () => {
  for (const [global, micro] of [['65', '32'], ['16', '32'], ['0', '1'], ['64', '0'],
    ['', '32'], ['64', ''], ['1.5', '1'], ['64', '1.5'], ['8192', '8192'], ['4097', '1']]) {
    expect(accumulationSteps(global, micro)).toBeNull();
  }
});
