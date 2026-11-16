import { expect, it } from 'vitest';
import { devMetricOptions, selectDevMetric } from './metricOptions';

it('offers all supported metrics with valid parameters and retains custom evaluation values', () => {
  const values = devMetricOptions([
    { name: 'GAUC', argument: null }, { name: 'AUC', argument: null },
    { name: 'NDCG', argument: 'cutoff' }, { name: 'Recall', argument: 'cutoff' },
    { name: 'HitRatio', argument: 'cutoff' }, { name: 'F1', argument: 'threshold' },
    { name: 'LogLoss', argument: null }, { name: 'MRR0', argument: null },
  ], ['GAUC', 'NDCG@5', 'F1@0.3'], 'GAUC');
  expect(values).toEqual(['GAUC', 'NDCG@5', 'F1@0.3', 'AUC', 'NDCG@10',
    'Recall@10', 'HitRatio@10', 'F1@0.5', 'LogLoss', 'MRR0']);
  expect(devMetricOptions([], ['GAUC'], 'AUC')).toEqual(['GAUC', 'AUC']);
});

it('adds the dev metric to evaluation without duplicates or losing configured metrics', () => {
  expect(selectDevMetric(['GAUC'], 'Recall@10')).toEqual({
    dev_metric: 'Recall@10', metrics: ['GAUC', 'Recall@10'],
  });
  expect(selectDevMetric(['GAUC', 'Recall@10'], 'Recall@10').metrics)
    .toEqual(['GAUC', 'Recall@10']);
});
