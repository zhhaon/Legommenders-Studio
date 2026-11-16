import { describe, it, expect } from 'vitest';
import { baselineDelta, datasetMatch, orderedMetrics, formatScore } from './benchmarkComparison';
describe('Benchmark mixed comparisons', () => {
  it('matches only explicit official datasets and aliases', () => {
    expect(datasetMatch('config/recbench/automotive.yaml').key).toBe('automotive');
    expect(datasetMatch('config/data/mind.yaml').key).toBe('mind');
    expect(datasetMatch('hmrb').key).toBe('hm');
    expect(datasetMatch('/custom/mind.yaml').key).toBeNull();
    expect(datasetMatch('config/data/unknown.yaml')).toEqual({key:null,blocked:false});
  });
  it('never treats samples, ONCE splits or xMIND language variants as full MIND', () => {
    for (const variant of ['config/data/mind-demo.yaml', 'config/data/xmind.yaml', 'oncemind']) expect(datasetMatch(variant)).toEqual({key:null,blocked:true});
  });
  it('computes raw deltas only for same-dataset finite metrics, including valid zero scores', () => {
    expect(baselineDelta(.612,.6088,true)).toBe('+0.0032');
    expect(baselineDelta(0,.1,true)).toBe('-0.1000');
    expect(baselineDelta(.6,.5,false)).toBeNull();
    expect(baselineDelta(undefined,.5,true)).toBeNull();
    expect(baselineDelta(NaN,.5,true)).toBeNull();
    expect(formatScore(undefined)).toBe('—');
  });
  it('orders metric cutoffs numerically', () => {
    expect(orderedMetrics(['NDCG@10','NDCG@5','GAUC','MRR','NDCG@1','GAUC'])).toEqual(['GAUC','MRR','NDCG@1','NDCG@5','NDCG@10']);
  });
});
