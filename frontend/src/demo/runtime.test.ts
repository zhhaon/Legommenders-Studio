import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/api/client';
import { clone, parseGraph, templates, validateGraph } from './runtime';

afterEach(() => vi.unstubAllGlobals());

describe('standalone static demo', () => {
  it('loads every bundled template with no network', async () => {
    const fetch = vi.fn(() => { throw new Error('Network prohibited'); });
    vi.stubGlobal('fetch', fetch);
    expect((await api.components()).components).toHaveLength(60);
    for (const template of templates) {
      const loaded = await api.template(template.id);
      expect(loaded.available).toBe(true);
      expect(loaded.graph?.nodes.length).toBeGreaterThan(0);
      const report = validateGraph(loaded.graph!);
      expect(report.errors, `${template.id}: ${JSON.stringify(report.errors)}`).toEqual([]);
    }
    expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects malformed graph imports and detects broken ports and cycles', () => {
    expect(() => parseGraph({ nodes: [] })).toThrow();
    const graph = clone(templates.find((t) => t.id === 'naml')!.graph!);
    graph.edges[0].sourceHandle = 'missing-port';
    graph.edges.push({ id: 'cycle', source: graph.nodes[0].id, target: graph.nodes[0].id, sourceHandle: 'dataset', targetHandle: 'missing' });
    const codes = validateGraph(graph).errors.map((e) => e.code);
    expect(codes).toContain('PORT');
    expect(codes).toContain('CYCLE');
  });
  it('saves and reloads edited graphs in browser storage', async () => {
    const data = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) });
    const graph = clone(templates.find((t) => t.id === 'naml')!.graph!);
    graph.name = 'Edited demo'; graph.nodes[0].position.x = 777;
    await api.saveGraph(graph);
    expect((await api.savedGraphs()).graphs[0].name).toBe('Edited demo');
    expect((await api.loadGraph(graph.graph_id)).graph.nodes[0].position.x).toBe(777);
  });
  it('blocks backend features without issuing requests', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const graph = templates[0].graph!;
    for (const action of [() => api.train(graph), () => api.evaluate(graph), () => api.compile(graph), () => api.verify(graph), () => api.importGraph({ yaml: 'name: test' })]) {
      await expect(action()).rejects.toThrow('Disabled in this static demo');
    }
    expect(fetch).not.toHaveBeenCalled();
  });
});
