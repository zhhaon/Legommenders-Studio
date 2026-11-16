import snapshot from './snapshot.json';
import { message } from '@/i18n';
import type { ComponentCatalog, TemplateSummary } from '@/types/catalog';
import type { BenchmarkIndex } from '@/types/benchmark';
import type { ValidationIssue, ValidationReport } from '@/types/api';
import { DEFAULT_TRAIN, emptyGraph, type GraphJson } from '@/types/graph';

const data = snapshot as unknown as {
  catalog: ComponentCatalog;
  templates: { templates: TemplateSummary[] };
  benchmark: BenchmarkIndex;
};
const components = new Map(data.catalog.components.map(c => [c.id, c]));
const copy = <T,>(value: T): T => structuredClone(value);
const disabled = (): never => { throw new Error(message('demo.disabled')); };
const PROJECTS = 'legommenders-demo:projects:v1';
type Project = { graph: GraphJson; saved_at: number };
function projects(): Record<string, Project> {
  const raw = localStorage.getItem(PROJECTS);
  return raw ? JSON.parse(raw) : {};
}

/** This checks file shape before it reaches the editor; it does not execute configs. */
export function parseGraph(value: unknown): GraphJson {
  const g = value as GraphJson;
  if (!g || typeof g !== 'object' || !Array.isArray(g.nodes) || !Array.isArray(g.edges)
    || !['matching', 'ranking'].includes(g.task)
    || (g.name !== undefined && typeof g.name !== 'string')
    || (g.graph_id !== undefined && typeof g.graph_id !== 'string')
    || g.nodes.some(n => !n || typeof n.id !== 'string' || typeof n.component !== 'string'
      || (n.params != null && (typeof n.params !== 'object' || Array.isArray(n.params)))
      || (n.position != null && (!Number.isFinite(n.position.x) || !Number.isFinite(n.position.y))))
    || g.edges.some(e => !e || ['id', 'source', 'target', 'sourceHandle', 'targetHandle'].some(k => typeof e[k as keyof typeof e] !== 'string'))
    || (g.train != null && (typeof g.train !== 'object' || Array.isArray(g.train)))
    || (g.train?.metrics !== undefined && (!Array.isArray(g.train.metrics) || g.train.metrics.some(m => typeof m !== 'string')))) {
    throw new Error(message('demo.invalid'));
  }
  return copy({ ...emptyGraph(), ...g, train: { ...DEFAULT_TRAIN, ...g.train },
    nodes: g.nodes.map(n => ({ ...n, params: n.params || {}, position: n.position || { x: 0, y: 0 } })) });
}

/** Deliberately limited to browser-side structure checks, never backend validation. */
export function validateStructure(g: GraphJson): ValidationReport {
  const errors: ValidationIssue[] = [];
  const issue = (code: string, node_id: string | null = null, edge_id: string | null = null) => errors.push({
    code, severity: 'error', message: message(`demo.${code}`), reason: '', fix: '', node_id, edge_id,
  });
  if (!g.nodes.length) issue('empty');
  const ids = new Set<string>();
  for (const n of g.nodes) {
    if (ids.has(n.id) || !components.has(n.component)) issue('node', n.id);
    ids.add(n.id);
  }
  const nodes = new Map(g.nodes.map(n => [n.id, n]));
  const occupied = new Set<string>();
  const edgeIds = new Set<string>();
  for (const e of g.edges) {
    const s = nodes.get(e.source), t = nodes.get(e.target);
    const out = components.get(s?.component || '')?.outputs.find(p => p.name === e.sourceHandle);
    const input = components.get(t?.component || '')?.inputs.find(p => p.name === e.targetHandle);
    const accepts = data.catalog.port_types.find(p => p.id === input?.type)?.accepts || [input?.type];
    const key = JSON.stringify([e.target, e.targetHandle]);
    if (!s || !t || s.id === t.id || !out || !input || !accepts.includes(out.type) || occupied.has(key) || edgeIds.has(e.id)) issue('edge', null, e.id);
    occupied.add(key); edgeIds.add(e.id);
  }
  for (const n of g.nodes) for (const port of components.get(n.component)?.inputs || []) {
    if (port.required && !occupied.has(JSON.stringify([n.id, port.name]))) issue('required', n.id);
  }
  const degree = new Map(g.nodes.map(n => [n.id, 0]));
  const adjacency = new Map(g.nodes.map(n => [n.id, [] as string[]]));
  for (const e of g.edges) if (nodes.has(e.source) && nodes.has(e.target)) {
    adjacency.get(e.source)!.push(e.target); degree.set(e.target, degree.get(e.target)! + 1);
  }
  const queue = [...degree].filter(([, d]) => d === 0).map(([id]) => id);
  for (let i = 0; i < queue.length; i++) for (const target of adjacency.get(queue[i]) || []) {
    degree.set(target, degree.get(target)! - 1); if (!degree.get(target)) queue.push(target);
  }
  if (queue.length !== nodes.size) issue('cycle');
  const role = (r: string) => g.nodes.find(n => components.get(n.component)?.role === r)?.component || null;
  return { valid: !errors.length, errors, warnings: [{ code: 'demo', severity: 'warning', message: message('demo.check'), reason: '', fix: '', node_id: null, edge_id: null }], runtime_checks: [],
    summary: { nodes: g.nodes.length, edges: g.edges.length, task: g.task, model_label: g.name,
      exact_template: null, dataset: role('dataset'), item_encoder: role('item_encoder'), user_encoder: role('user_encoder'), predictor: role('predictor') } };
}

// All former API calls terminate here. There is no network fallback.
export async function demoRequest(path: string, body?: unknown): Promise<unknown> {
  const payload = body as GraphJson;
  if (path === '/components') return copy(data.catalog);
  if (path === '/templates') return copy(data.templates);
  if (path.startsWith('/templates/')) {
    const t = data.templates.templates.find(t => t.id === decodeURIComponent(path.slice(11)));
    if (!t) throw new Error('Unknown template');
    return copy(t);
  }
  if (path === '/benchmark/evaluations') return copy(data.benchmark);
  if (path.startsWith('/benchmark/evaluations/')) {
    const evaluation = data.benchmark.evaluations.find(e => e.signature === decodeURIComponent(path.slice('/benchmark/evaluations/'.length)));
    if (!evaluation) throw new Error('Unknown Benchmark entry');
    return { evaluation: copy(evaluation), source: data.benchmark.source };
  }
  if (path === '/health') return { status: 'static-demo' };
  if (path === '/environment') return { python: '', executable: '', torch: '', cuda_available: false, cuda_device_count: 0, device_name: null, dependencies: {}, trainer_script: false, data_root_exists: false, datasets: [], embeddings: [], warnings: [message('demo.notice')] };
  if (path === '/runs') return { runs: [] };
  if (path === '/graph/validate') return validateStructure(parseGraph(payload));
  if (path === '/graph/import') {
    const graph = (body as { graph?: unknown }).graph;
    if (!graph) return disabled();
    const parsed = parseGraph(graph);
    return { graph: parsed, validation: validateStructure(parsed) };
  }
  if (path === '/graphs/save') {
    const graph = parseGraph((body as { graph: unknown }).graph);
    const saved = projects();
    saved[graph.graph_id] = { graph, saved_at: Date.now() / 1000 };
    localStorage.setItem(PROJECTS, JSON.stringify(saved));
    return { saved: true, graph_id: graph.graph_id };
  }
  if (path === '/graphs') return { graphs: Object.values(projects()).sort((a,b) => a.saved_at - b.saved_at).map(({graph, saved_at}) => ({ graph_id: graph.graph_id, name: graph.name, task: graph.task, nodes: graph.nodes.length, saved_at })) };
  if (path.startsWith('/graphs/')) {
    const stored = projects()[decodeURIComponent(path.slice(8))];
    if (!stored) throw new Error(message('demo.invalid'));
    const graph = parseGraph(stored.graph);
    return { graph, validation: validateStructure(graph) };
  }
  if (path.startsWith('/components/') && path.includes('/compatible')) {
    const id = decodeURIComponent(path.split('/')[2]);
    const source = components.get(id);
    const upstream = path.includes('direction=upstream');
    const compatible = data.catalog.components.filter(target => source && (upstream ? target.outputs : source.outputs).some(out => (upstream ? source.inputs : target.inputs).some(input => (data.catalog.port_types.find(p => p.id === input.type)?.accepts || [input.type]).includes(out.type))));
    return { results: compatible.map(c => ({ ...c, reasons: [] })) };
  }
  if (path === '/graph/dataset-inputs') {
    // Static illustrative columns, independent of server files or downloaded datasets.
    const dataset = payload.nodes.find(n => n.component.startsWith('dataset.'));
    const params = dataset?.params || {};
    const spec = components.get(dataset?.component || '');
    const lm = params.lm || spec?.parameters.find(p => p.name === 'lm')?.default || 'glove';
    const recbench = String(params.data_config || spec?.parameters.find(p => p.name === 'data_config')?.default || '').includes('recbench');
    const defaults = recbench ? [{ column: 'item_id', truncate: null }] : [{ column: `title@${lm}`, truncate: 30 }];
    return { defaults, columns: [...new Set([...defaults.map(e => e.column), `abstract@${lm}`, 'category', 'subcategory', 'item_id'])] };
  }
  return disabled();
}
