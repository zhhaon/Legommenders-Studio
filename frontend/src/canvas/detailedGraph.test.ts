import { describe, it, expect } from 'vitest';
import { detailedGraph } from './detailedGraph';
import { type GraphNode, emptyGraph } from '@/types/graph';
import type { ComponentSpec } from '@/types/catalog';

function fixture(matching = true, count = 4, withItem = true) {
  const graph = emptyGraph();
  const categories = [...(withItem ? ['item_encoder'] : []), 'user_encoder', 'predictor', 'training'];
  graph.nodes = categories.map<GraphNode>((c, i) => ({ id: c, component: c === 'training' ? `training.${matching ? 'matching' : 'ranking'}_task` : c, params: (c === 'training' ? { neg_count: count } : {}) as GraphNode['params'], position: { x: i, y: 0 } }));
  const specs = Object.fromEntries(graph.nodes.map(n => [n.component, { name: n.component, category: n.id, parameters: [] } as unknown as ComponentSpec]));
  return { graph, specs };
}
describe('expanded model data flow', () => {
  it.each([0, 1, 2, 4, 10])('shows sampled matching branches for neg_count=%i', count => {
    const { graph, specs } = fixture(true, count);
    const before = JSON.stringify(graph);
    const result = detailedGraph(graph, specs)!;
    const candidates = 1 + Math.min(count, 2);
    expect(result.nodes.filter(n => n.data.title === 'Item Encoder')).toHaveLength(3 + candidates);
    expect(result.nodes.filter(n => n.data.title === 'Predictor')).toHaveLength(candidates);
    expect(result.edges.filter(e => e.target === 'objective')).toHaveLength(candidates);
    expect(result.nodes.some(n => n.id === 'negative:ellipsis')).toBe(count > 2);
    expect(result.edges.filter(e => e.source === 'user:embedding')).toHaveLength(candidates);
    expect(JSON.stringify(graph)).toBe(before);
    expect(new Set(result.edges.map(e => e.id)).size).toBe(result.edges.length);
    result.edges.forEach(e => {
      expect(result.nodes.some(n => n.id === e.source)).toBe(true);
      expect(result.nodes.some(n => n.id === e.target)).toBe(true);
    });
  });
  it('uses ranking task component even before graph task metadata updates', () => {
    const { graph, specs } = fixture(false);
    const result = detailedGraph(graph, specs)!;
    expect(result.nodes.filter(n => n.data.title === 'Predictor')).toHaveLength(1);
    expect(result.nodes.find(n => n.id === 'objective')?.data.title).toBe('Ranking Task');
    expect(result.nodes.some(n => n.data.title.startsWith('Negative Candidate'))).toBe(false);
  });
  it('supports architectures with precomputed item representations', () => {
    const { graph, specs } = fixture(true, 4, false);
    const result = detailedGraph(graph, specs)!;
    expect(result.nodes.filter(n => n.data.title === 'Item Encoder')).toHaveLength(0);
    expect(result.nodes.filter(n => n.data.title === 'Item Embedding')).toHaveLength(6);
  });
  it('keeps incomplete custom graphs editable', () => {
    expect(detailedGraph(emptyGraph(), {})).toBeNull();
  });
});
