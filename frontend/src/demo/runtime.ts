import snapshot from './snapshot.json';
import type { ComponentCatalog, TemplateSummary } from '@/types/catalog';
import type { GraphJson } from '@/types/graph';
import type { ValidationIssue, ValidationReport } from '@/types/api';
import { canMigrate } from '@/store/replacement';

export const catalog = snapshot.catalog as ComponentCatalog;
export const templates = snapshot.templates as TemplateSummary[];
export const references: Record<string, string> = snapshot.references;
export const components = Object.fromEntries(catalog.components.map((c) => [c.id, c]));
export const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

// This validates the editor's interchange format, not Python runtime compatibility.
export function parseGraph(value: unknown): GraphJson {
  if (!value || typeof value !== 'object') throw new Error('Expected a Graph JSON object.');
  const g = value as GraphJson;
  if (g.schema_version !== '1.0' || typeof g.graph_id !== 'string' || !g.graph_id ||
      typeof g.name !== 'string' || !['matching', 'ranking'].includes(g.task) ||
      !Array.isArray(g.nodes) || !Array.isArray(g.edges) || !g.train ||
      typeof g.train !== 'object' || !Array.isArray(g.train.metrics) ||
      !g.train.metrics.every((metric) => typeof metric === 'string') ||
      !g.train.extra_cli || typeof g.train.extra_cli !== 'object') {
    throw new Error('Invalid Graph JSON: expected schema 1.0, graph_id, name, task, nodes, edges and train.');
  }
  if (g.nodes.length > 500 || g.edges.length > 2000) throw new Error('Demo limit: 500 nodes and 2000 edges.');
  for (const n of g.nodes) {
    if (!n || typeof n.id !== 'string' || !n.id || typeof n.component !== 'string' ||
        !n.params || typeof n.params !== 'object' || Array.isArray(n.params) ||
        !n.position || !Number.isFinite(n.position.x) || !Number.isFinite(n.position.y)) {
      throw new Error('Invalid node: expected id, component, params and finite position.');
    }
  }
  for (const e of g.edges) {
    if (!e || !['id', 'source', 'target', 'sourceHandle', 'targetHandle'].every((key) =>
      typeof e[key as keyof typeof e] === 'string' && e[key as keyof typeof e].length > 0)) {
      throw new Error('Invalid edge: expected id, endpoints and port handles.');
    }
  }
  return clone(g);
}

export function validateGraph(graph: GraphJson): ValidationReport {
  parseGraph(graph);
  const errors: ValidationIssue[] = [];
  const issue = (code: string, message: string, node_id: string | null = null, edge_id: string | null = null) =>
    errors.push({ code, severity: 'error', message, reason: message, fix: 'Edit the graph and check again.', node_id, edge_id });
  const nodes = new Map(graph.nodes.map((n) => [n.id, n]));
  const seen = new Set<string>();
  for (const n of graph.nodes) {
    if (seen.has(n.id)) issue('DUPLICATE_NODE', `Duplicate node id: ${n.id}`, n.id);
    seen.add(n.id);
    const spec = components[n.component];
    if (!spec) { issue('UNKNOWN_COMPONENT', `Unknown component: ${n.component}`, n.id); continue; }
    if (!spec.tasks.includes(graph.task)) issue('TASK', `${spec.name} does not support ${graph.task}.`, n.id);
    for (const p of spec.parameters) {
      const value = n.params[p.name] ?? p.default;
      if (p.required && value == null && !p.nullable) issue('PARAM_REQUIRED', `${spec.name}: ${p.name} is required.`, n.id);
      else if (value != null && !p.read_only && !canMigrate(value as never, p)) issue('PARAM_VALUE', `${spec.name}: invalid ${p.name}.`, n.id);
    }
    for (const port of spec.inputs.filter((p) => p.required)) {
      if (!graph.edges.some((e) => e.target === n.id && e.targetHandle === port.name))
        issue('REQUIRED_INPUT', `${spec.name}: connect ${port.name}.`, n.id);
    }
  }
  const occupied = new Set<string>();
  const edgeIds = new Set<string>();
  for (const e of graph.edges) {
    if (edgeIds.has(e.id)) issue('DUPLICATE_EDGE', `Duplicate edge id: ${e.id}`, null, e.id);
    edgeIds.add(e.id);
    const source = nodes.get(e.source), target = nodes.get(e.target);
    const out = source && components[source.component]?.outputs.find((p) => p.name === e.sourceHandle);
    const input = target && components[target.component]?.inputs.find((p) => p.name === e.targetHandle);
    if (!out || !input) issue('PORT', 'An edge references a missing node or port.', null, e.id);
    else if (!(catalog.port_types.find((p) => p.id === input.type)?.accepts ?? [input.type]).includes(out.type))
      issue('PORT_TYPE', `${out.type} cannot connect to ${input.type}.`, null, e.id);
    const key = JSON.stringify([e.target, e.targetHandle]);
    if (occupied.has(key)) issue('MULTIPLE_INPUTS', 'An input port has multiple connections.', e.target, e.id);
    occupied.add(key);
  }
  const indegree = new Map(graph.nodes.map((n) => [n.id, 0]));
  for (const e of graph.edges) if (nodes.has(e.source) && nodes.has(e.target)) indegree.set(e.target, indegree.get(e.target)! + 1);
  const queue = [...indegree].filter(([, d]) => d === 0).map(([id]) => id);
  let visited = 0;
  while (queue.length) {
    const id = queue.pop()!; visited++;
    for (const e of graph.edges.filter((edge) => edge.source === id)) {
      if (!indegree.has(e.target)) continue;
      const next = indegree.get(e.target)! - 1; indegree.set(e.target, next);
      if (next === 0) queue.push(e.target);
    }
  }
  if (visited < nodes.size) issue('CYCLE', 'The graph contains a cycle.');
  for (const role of ['dataset', 'user_encoder', 'predictor', 'training']) {
    if (!graph.nodes.some((n) => components[n.component]?.role === role)) issue('MISSING_ROLE', `Add a ${role} component.`);
  }
  const name = (role: string) => graph.nodes.find((n) => components[n.component]?.role === role)?.component ?? null;
  return {
    valid: errors.length === 0, errors,
    warnings: [{ code: 'DEMO_ONLY', severity: 'warning', message: 'Basic browser checks only. Python compilation, resources, dimensions and runtime compatibility are not verified.', reason: 'Static demo', fix: 'Use the full backend for runtime verification.', node_id: null, edge_id: null }],
    runtime_checks: [],
    summary: { nodes: graph.nodes.length, edges: graph.edges.length, task: graph.task, model_label: graph.name || 'Custom Model', exact_template: null, dataset: name('dataset'), item_encoder: name('item_encoder'), user_encoder: name('user_encoder'), predictor: name('predictor') },
  };
}

const SAVES_KEY = 'legommenders-demo-projects-v1';
type Saved = { graph: GraphJson; saved_at: number };
export function readSaves(): Record<string, Saved> {
  try { return JSON.parse(localStorage.getItem(SAVES_KEY) || '{}') as Record<string, Saved>; }
  catch { return {}; }
}
export function saveGraph(graph: GraphJson) {
  const entries = readSaves();
  Object.defineProperty(entries, graph.graph_id, { value: { graph: parseGraph(graph), saved_at: Date.now() / 1000 }, enumerable: true, configurable: true });
  localStorage.setItem(SAVES_KEY, JSON.stringify(entries));
  return { saved: true, graph_id: graph.graph_id };
}
