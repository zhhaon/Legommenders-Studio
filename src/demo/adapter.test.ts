import { afterEach, describe, expect, it, vi } from 'vitest';
import { demoRequest, parseGraph, validateStructure } from './adapter';
import { emptyGraph } from '@/types/graph';
import type { TemplateSummary } from '@/types/catalog';
import type { BenchmarkIndex } from '@/types/benchmark';

afterEach(() => vi.unstubAllGlobals());

describe('standalone demo', () => {
  it('loads every template and Benchmark detail without network access', async () => {
    const fetch = vi.fn(() => { throw new Error('network forbidden'); });
    vi.stubGlobal('fetch', fetch);
    const { templates } = await demoRequest('/templates') as { templates: TemplateSummary[] };
    expect(templates).toHaveLength(14);
    for (const template of templates) {
      const t = await demoRequest(`/templates/${template.id}`) as TemplateSummary;
      expect(t.available).toBe(true);
      const report = validateStructure(parseGraph(t.graph));
      expect(report.errors, template.id).toEqual([]);
    }
    const index = await demoRequest('/benchmark/evaluations') as BenchmarkIndex;
    expect(index.total).toBe(index.evaluations.length);
    expect(index.total).toBeGreaterThan(0);
    for (const e of [index.evaluations[0], index.evaluations.at(-1)!]) {
      expect(await demoRequest(`/benchmark/evaluations/${e.signature}`)).toMatchObject({ evaluation: { signature: e.signature } });
    }
    expect(fetch).not.toHaveBeenCalled();
  });
  it('blocks backend operations rather than simulating successful execution', async () => {
    for (const path of ['/train', '/evaluate', '/graph/compile', '/diagnostics/verify', '/resources/download']) {
      await expect(demoRequest(path, emptyGraph())).rejects.toThrow();
    }
    await expect(demoRequest('/graph/import', { yaml: 'name: NAML' })).rejects.toThrow();
  });
  it('round trips browser projects and JSON imports without network access', async () => {
    const saved = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => saved.get(k) || null, setItem: (k: string, v: string) => saved.set(k, v) });
    const graph = emptyGraph('My canvas');
    await demoRequest('/graphs/save', { graph });
    expect(await demoRequest('/graphs')).toMatchObject({ graphs: [{ name: 'My canvas', nodes: 0 }] });
    expect(await demoRequest(`/graphs/${graph.graph_id}`)).toMatchObject({ graph });
    expect(await demoRequest('/graph/import', { graph: JSON.parse(JSON.stringify(graph)) })).toMatchObject({ graph });
  });
  it('rejects malformed imports and reports broken connections and duplicate IDs', () => {
    for (const value of [null, {}, { ...emptyGraph(), nodes: [null] }, { ...emptyGraph(), train: { metrics: 123 } }]) {
      expect(() => parseGraph(value)).toThrow();
    }
    const graph = emptyGraph();
    graph.nodes = [{ id: 'n', component: 'missing', params: {}, position: { x: 0, y: 0 } }];
    graph.nodes.push({ ...graph.nodes[0] });
    graph.edges = [{ id: 'e', source: 'n', target: 'missing', sourceHandle: 'x', targetHandle: 'y' }];
    expect(validateStructure(graph).valid).toBe(false);
  });
});
