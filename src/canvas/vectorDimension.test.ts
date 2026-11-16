import { expect, it } from 'vitest';
import { vectorDimension } from './vectorDimension';
import { emptyGraph, type GraphNode } from '@/types/graph';
import type { ComponentSpec } from '@/types/catalog';
it('resolves output dimensions rather than assuming token embedding width', () => {
  const graph = emptyGraph();
  graph.train.hidden_size = 32;
  graph.train.item_hidden_size = 768;
  const node = { component: 'item.cnn', params: {} } as GraphNode;
  const spec = (name: string) => ({ source: { class: name }, category: 'item_encoder', role: 'item_encoder' } as unknown as ComponentSpec);
  expect(vectorDimension(graph, node, spec('CNNOperator'), 768)).toBe(32);
  expect(vectorDimension(graph, node, spec('CNNCatOperator'), 768, 3)).toBe(96);
  expect(vectorDimension(graph, node, spec('CNNCatOperator'), 768)).toBeNull();
  expect(vectorDimension(graph, node, spec('SingleColumnOperator'), 768)).toBe(768);
  expect(vectorDimension(graph, node, spec('AdaOperator'), 96)).toBe(96);
  expect(vectorDimension(graph, { ...node, params: { hidden_size: 64 } }, spec('CNNOperator'), 768)).toBe(64);
});
