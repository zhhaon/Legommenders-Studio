import { describe, it, expect } from 'vitest';
import { detailedGraph, detailConnection, selectedDetailInstanceId, selectedDetailEdgeInstanceId } from './detailedGraph';
import { type GraphNode, emptyGraph } from '@/types/graph';
import templates from './fixtures/modelGraphs.json';
import type { GraphJson } from '@/types/graph';
import type { ComponentSpec } from '@/types/catalog';

function fixture(matching = true, count = 4, withItem = true) {
  const graph = emptyGraph();
  const categories = [...(withItem ? ['item_encoder'] : []), 'user_encoder', 'predictor', 'training'];
  graph.nodes = categories.map<GraphNode>((c, i) => ({ id: c, component: c === 'training' ? `training.${matching ? 'matching' : 'ranking'}_task` : c, params: (c === 'training' ? { neg_count: count } : {}) as GraphNode['params'], position: { x: i, y: 0 } }));
  const specs = Object.fromEntries(graph.nodes.map(n => [n.component, { name: n.component, category: n.id, parameters: [] } as unknown as ComponentSpec]));
  graph.task = matching ? 'matching' : 'ranking';
  graph.edges = [
    { id: 'history', source: withItem ? 'item_encoder' : 'dataset', target: 'user_encoder', sourceHandle: 'history', targetHandle: 'history' },
    { id: 'candidate', source: withItem ? 'item_encoder' : 'dataset', target: 'predictor', sourceHandle: withItem ? 'candidate' : 'features', targetHandle: 'candidate' },
    { id: 'user', source: 'user_encoder', target: 'predictor', sourceHandle: 'user', targetHandle: 'user' },
    { id: 'score', source: 'predictor', target: 'training', sourceHandle: 'score', targetHandle: 'score' },
  ];
  if (!withItem) {
    graph.nodes.push({ id: 'dataset', component: 'dataset', params: {}, position: { x: 0, y: 0 } });
    specs.dataset = { name: 'Dataset', category: 'dataset', parameters: [] } as unknown as ComponentSpec;
  }
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
  it('uses the actual ranking task metadata', () => {
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

describe('real topology and editing mappings', () => {
  const specFor = (graph: GraphJson) => Object.fromEntries(graph.nodes.map(n => [n.component, {
    name: n.component, category: n.component.startsWith('item.') ? 'item_encoder' : n.component.startsWith('user.') ? 'user_encoder' : n.component.split('.')[0], parameters: [],
  } as unknown as ComponentSpec]));
  it.each(templates.map(g => [g.name, g] as const))('%s preserves modules and actual non-Dataset paths', (_, raw) => {
    const graph = raw as GraphJson, specs = specFor(graph);
    const before = JSON.stringify(graph);
    const result = detailedGraph(graph, specs)!;
    expect(new Set(result.nodes.flatMap(n => n.data.originalId ? [n.data.originalId] : []))).toEqual(new Set(graph.nodes.map(n => n.id)));
    const datasetIds = new Set(graph.nodes.filter(n => specs[n.component]?.category === 'dataset').map(n => n.id));
    const displayedIds = new Set(result.edges.flatMap(e => e.data?.originalEdgeId ? [e.data.originalEdgeId] : []));
    for (const edge of graph.edges.filter(e => !datasetIds.has(e.source) && !datasetIds.has(e.target))) expect(displayedIds.has(edge.id)).toBe(true);
    for (const id of displayedIds) expect(graph.edges.some(e => e.id === id)).toBe(true);
    for (const edge of result.edges) {
      const source = result.nodes.find(n => n.id === edge.source)!;
      if (datasetIds.has(source.data.originalId || '')) expect(source.data.datasetProxy).toBe(true);
      expect(datasetIds.has(result.nodes.find(n => n.id === edge.target)?.data.originalId || '')).toBe(false);
    }
    // Each real connection must have a directed expanded path between its modules.
    for (const edge of graph.edges.filter(e => !datasetIds.has(e.source) && !datasetIds.has(e.target))) {
      const pending = result.nodes.filter(n => n.data.originalId === edge.source).map(n => n.id);
      const visited = new Set(pending);
      while (pending.length) {
        const id = pending.pop()!;
        for (const segment of result.edges.filter(e => e.source === id && (!e.data?.originalEdgeId || e.data.originalEdgeId === edge.id))) {
          if (!visited.has(segment.target)) { visited.add(segment.target); pending.push(segment.target); }
        }
      }
      expect(result.nodes.some(n => n.data.originalId === edge.target && visited.has(n.id))).toBe(true);
    }
    for (const removed of graph.edges) {
      const projection = detailedGraph({ ...graph, edges: graph.edges.filter(e => e.id !== removed.id) }, specs)!;
      expect(projection.edges.some(e => e.data?.originalEdgeId === removed.id)).toBe(false);
    }
    expect(JSON.stringify(graph)).toBe(before);
    const disconnected = detailedGraph({ ...graph, edges: [] }, specs)!;
    expect(disconnected.edges.every(e => !e.data?.originalEdgeId)).toBe(true);
  });
  it('does not attach an isolated item encoder to DIN', () => {
    const din = templates.find(g => g.nodes.some(n => n.component === 'predictor.din'))! as GraphJson;
    const graph = { ...din, nodes: [...din.nodes, { id: 'orphan', component: 'item.cnn', params: {}, position: { x: 0, y: 0 } }] };
    const result = detailedGraph(graph, specFor(graph))!;
    expect(result.nodes.filter(n => n.data.originalId === 'orphan')).toHaveLength(1);
    expect(result.nodes.find(n => n.data.originalId === 'orphan')?.data.subtitle).toContain('Disconnected');
    expect(result.edges.some(e => e.source === 'extra:orphan' || e.target === 'extra:orphan')).toBe(false);
    expect(result.nodes.some(n => n.data.title === 'User Embedding')).toBe(true);
  });
  it('maps shared instances to real editable ports, never display-only handles', () => {
    const { graph, specs } = fixture();
    const nodes = detailedGraph(graph, specs)!.nodes;
    for (const source of ['h1:encoder', 'positive:encoder']) {
      expect(detailConnection({ source, target: 'user:encoder', sourceHandle: 'port:history', targetHandle: 'port:history' }, nodes)).toEqual({ source: 'item_encoder', target: 'user_encoder', sourceHandle: 'history', targetHandle: 'history' });
      expect(detailConnection({ source, target: 'user:embedding', sourceHandle: 'port:history', targetHandle: 'in' }, nodes)).toBeNull();
    }
  });
  it('keeps partial, unknown and duplicate-slot custom modules visible', () => {
    const { graph, specs } = fixture();
    graph.nodes.push({ ...graph.nodes[0], id: 'duplicate' });
    graph.edges = [{ id: 'custom', source: 'duplicate', target: 'user_encoder', sourceHandle: 'custom', targetHandle: 'custom' }];
    let result = detailedGraph(graph, specs)!;
    expect(result.nodes.some(n => n.data.originalId === 'duplicate')).toBe(true);
    expect(result.edges.some(e => e.data?.originalEdgeId === 'custom')).toBe(true);
    result = detailedGraph({ ...graph, nodes: graph.nodes.filter(n => n.id !== 'training'), edges: [] }, specs)!;
    expect(result.nodes.filter(n => n.data.originalId)).toHaveLength(graph.nodes.length - 1);
  });
});

describe('partial encoder paths', () => {
  it('expands only the connected side and leaves missing content visibly unconnected', () => {
    const { graph, specs } = fixture();
    graph.edges = graph.edges.filter(e => e.id !== 'candidate');
    const result = detailedGraph(graph, specs)!;
    expect(result.nodes.filter(n => n.data.title === 'Item Encoder')).toHaveLength(3);
    expect(result.nodes.some(n => n.id === 'positive:encoder')).toBe(false);
    expect(result.nodes.find(n => n.id === 'h1:encoder')?.data.subtitle).toContain('missing content input');
    expect(result.edges.some(e => e.source === 'h1:item' && e.target === 'h1:encoder')).toBe(false);
    expect(result.edges.filter(e => e.data?.originalEdgeId === 'history')).toHaveLength(3);
  });
});

describe('flow colors', () => {
  it('colors lines and arrows by the source stage', () => {
    const { graph, specs } = fixture();
    const result = detailedGraph(graph, specs)!;
    for (const edge of result.edges) {
      const color = result.nodes.find(n => n.id === edge.source)!.data.color;
      expect(edge.style?.stroke).toBe(color);
      expect(edge.markerEnd).toMatchObject({ color });
    }
    expect(new Set(result.edges.map(e => e.style?.stroke))).toEqual(new Set(['#16a34a', '#ea580c', '#7c3aed']));
  });
});

describe('branch annotations', () => {
  it.each([true, false])('only annotates existing branches (matching=%s)', matching => {
    const { graph, specs } = fixture(matching, 4);
    for (const history of [true, false]) for (const candidates of [true, false]) {
      const result = detailedGraph({ ...graph, edges: graph.edges.filter(e =>
        (e.id !== 'history' || history) && (e.id !== 'candidate' || candidates)) }, specs)!;
      const has = (id: string) => result.nodes.some(n => n.id === id);
      expect(has('sequence')).toBe(history);
      expect(has('history:ellipsis')).toBe(history);
      expect(has('h1:item')).toBe(history);
      expect(has('candidates')).toBe(candidates);
      expect(has('negative:ellipsis')).toBe(candidates && matching);
      expect(has('positive:item')).toBe(candidates);
    }
    // Restoring connections restores their annotations as well.
    const restored = detailedGraph(graph, specs)!;
    expect(restored.nodes.some(n => n.id === 'sequence' && n.data.subtitle === 'History in chronological order')).toBe(true);
    expect(restored.nodes.some(n => n.id === 'candidates')).toBe(true);
  });
});


describe('dataset entry cards', () => {
  it.each([true, false])('maps numbered entries to their dataset without changing Config (item=%s)', withItem => {
    const { graph, specs } = fixture(true, 4, withItem);
    if (withItem) {
      graph.nodes.push({ id: 'dataset', component: 'dataset', label: 'MIND-small', params: { lang: 'en' }, position: { x: 10, y: 20 } });
      specs.dataset = { name: 'Dataset', category: 'dataset', parameters: [] } as unknown as ComponentSpec;
      graph.edges.push({ id: 'content', source: 'dataset', target: 'item_encoder', sourceHandle: 'content', targetHandle: 'content' });
    }
    const before = JSON.stringify(graph);
    const result = detailedGraph(graph, specs)!;
    const entries = result.nodes.filter(n => n.data.datasetProxy);
    expect(entries).toHaveLength(6);
    expect(entries.every(n => n.data.originalId === 'dataset' && n.data.color === '#3b82f6')).toBe(true);
    expect(entries.map(n => n.data.title)).toEqual(['Item 1', 'Item 2', 'Item N', 'Positive Candidate', 'Negative Candidate 1', 'Negative Candidate 4']);
    expect(result.nodes.some(n => n.id === 'extra:dataset')).toBe(false);
    expect(result.edges.some(e => e.source === 'h1:item')).toBe(true);
    expect(JSON.stringify(graph)).toBe(before);
    const updated = { ...graph, nodes: graph.nodes.map(n => n.id === 'dataset' ? { ...n, label: 'Renamed', params: { lang: 'zh' } } : n) };
    expect(detailedGraph(updated, specs)!.nodes.filter(n => n.data.datasetProxy).every(n => n.data.originalId === 'dataset')).toBe(true);
  });
  it('does not assign a disconnected entry to an unrelated dataset', () => {
    const { graph, specs } = fixture();
    graph.nodes.push({ id: 'other', component: 'dataset', params: {}, position: { x: 0, y: 0 } });
    specs.dataset = { name: 'Dataset', category: 'dataset', parameters: [] } as unknown as ComponentSpec;
    const result = detailedGraph(graph, specs)!;
    expect(result.nodes.find(n => n.id === 'h1:item')?.data).toMatchObject({ datasetProxy: true, subtitle: 'Dataset not connected' });
    expect(result.nodes.find(n => n.id === 'h1:item')?.data.originalId).toBeUndefined();
    expect(result.nodes.find(n => n.id === 'extra:other')?.data.title).toBe('Item');
  });
  it('resolves separate datasets through each encoder connection', () => {
    const { graph, specs } = fixture();
    for (const id of ['a', 'b']) graph.nodes.push({ id, component: 'dataset', params: {}, position: { x: 0, y: 0 } });
    specs.dataset = { name: 'Dataset', category: 'dataset', parameters: [] } as unknown as ComponentSpec;
    graph.nodes.push({ ...graph.nodes[0], id: 'second_encoder' });
    graph.edges = graph.edges.map(e => e.id === 'candidate' ? { ...e, source: 'second_encoder' } : e);
    graph.edges.push(...['a', 'b'].map((id, i) => ({ id: `content-${id}`, source: id, target: i ? 'second_encoder' : 'item_encoder', sourceHandle: 'content', targetHandle: 'content' })));
    const result = detailedGraph(graph, specs)!;
    expect(result.nodes.find(n => n.id === 'h1:item')?.data.originalId).toBe('a');
    expect(result.nodes.find(n => n.id === 'positive:item')?.data.originalId).toBe('b');
  });
});

it('projects example vectors and keycap positive scores with stage colors', () => {
  const { graph, specs } = fixture();
  const before = JSON.stringify(graph);
  const result = detailedGraph(graph, specs)!;
  const item = result.nodes.find(n => n.id === 'h1:embedding')!;
  expect(item.data).toMatchObject({ valueKind: 'item-vector', dimensionSourceId: 'item_encoder', color: '#16a34a' });
  expect(result.nodes.find(n => n.id === 'user:embedding')?.data).toMatchObject({ valueKind: 'user-vector', color: '#ea580c', userSourceId: 'user_encoder' });
  expect(result.nodes.find(n => n.id === 'positive:score')?.data).toMatchObject({ valueKind: 'score', positiveScore: true, exampleScore: '0.732', color: '#7c3aed' });
  expect(result.nodes.find(n => n.id === 'negative1:score')?.data.positiveScore).toBe(false);
  expect(JSON.stringify(graph)).toBe(before);
  const ranking = fixture(false);
  expect(detailedGraph(ranking.graph, ranking.specs)!.nodes.find(n => n.id === 'positive:score')?.data.positiveScore).toBe(false);
});


it('selects only the clicked alias instead of every instance of a shared component', () => {
  const nodes = [
    { id: 'user:1', data: { originalId: 'user' } },
    { id: 'user:2', data: { originalId: 'user' } },
    { id: 'positive:predictor', data: { originalId: 'predictor' } },
    { id: 'negative:predictor', data: { originalId: 'predictor' } },
    { id: 'h1:item', data: { originalId: 'dataset', datasetProxy: true } },
    { id: 'h2:item', data: { originalId: 'dataset', datasetProxy: true } },
  ] as unknown as import('./detailedGraph').DetailNode[];
  for (const [original, clicked] of [['user', 'user:2'], ['predictor', 'negative:predictor'], ['dataset', 'h2:item']]) {
    const selected = selectedDetailInstanceId(nodes, original, clicked);
    expect(nodes.filter(node => node.id === selected).map(node => node.id)).toEqual([clicked]);
  }
  expect(selectedDetailInstanceId(nodes, 'predictor', null)).toBe('positive:predictor');
  expect(selectedDetailInstanceId(nodes, 'predictor', 'user:2')).toBe('positive:predictor');
  expect(selectedDetailInstanceId(nodes, null, 'user:2')).toBeNull();
  expect(selectedDetailInstanceId(nodes, 'missing', null)).toBeNull();
});


it('selects a single projected connection while keeping its original graph edge identity', () => {
  const edges = [
    { id: 'history:1', data: { originalEdgeId: 'history' } },
    { id: 'history:2', data: { originalEdgeId: 'history' } },
    { id: 'positive:score', data: { originalEdgeId: 'score' } },
    { id: 'negative:score', data: { originalEdgeId: 'score' } },
    { id: 'representation', data: {} },
  ] as import('@xyflow/react').Edge[];
  expect(selectedDetailEdgeInstanceId(edges, 'history', 'history:2')).toBe('history:2');
  expect(selectedDetailEdgeInstanceId(edges, 'score', 'negative:score')).toBe('negative:score');
  expect(selectedDetailEdgeInstanceId(edges, 'score', null)).toBe('positive:score');
  expect(selectedDetailEdgeInstanceId(edges, 'score', 'history:2')).toBe('positive:score');
  expect(selectedDetailEdgeInstanceId(edges, null, 'history:2')).toBeNull();
  expect(selectedDetailEdgeInstanceId(edges, 'missing', null)).toBeNull();
});
