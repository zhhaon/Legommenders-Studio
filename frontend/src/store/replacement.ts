import type { ComponentSpec, ParamSpec, PortTypeMeta } from '@/types/catalog';
import type { DatasetInput, GraphEdge, GraphJson, GraphNode, ParamValue, TaskType } from '@/types/graph';

export const FIXED_ROLES = new Set(['dataset', 'item_encoder', 'user_encoder', 'predictor', 'training']);

export function canMigrate(value: ParamValue, param: ParamSpec): boolean {
  if (param.read_only) return false;
  if (value === null) return Boolean(param.nullable);
  if (param.type === 'enum') return typeof value === 'string' && (!param.choices.length || param.choices.includes(value));
  if (param.type === 'list') return Array.isArray(value);
  if (param.type === 'object') return typeof value === 'object' && !Array.isArray(value);
  const kind = param.type === 'integer' ? 'number' : param.type.split('_or_list')[0];
  const values = Array.isArray(value) && param.type.endsWith('_or_list') ? value : [value];
  return values.every((entry) =>
    typeof entry === kind && (typeof entry !== 'number' ||
      (Number.isFinite(entry) && (param.type !== 'integer' || Number.isInteger(entry)) &&
      (param.minimum == null || entry >= param.minimum) && (param.maximum == null || entry <= param.maximum))),
  );
}

export function taskSwitchError(
  graph: GraphJson, task: TaskType, components: Record<string, ComponentSpec>,
): string | null {
  const predictor = graph.nodes.find((node) => components[node.component]?.role === 'predictor');
  const spec = predictor && components[predictor.component];
  if (spec && !spec.tasks.includes(task)) {
    return `${spec.name} does not support the ${task} task. Replace the predictor first.`;
  }
  const objectives = graph.nodes.filter((node) => components[node.component]?.role === 'training');
  if (objectives.some((node) => !components[node.component].tasks.includes(task)) &&
      !components[`training.${task}_task`]) {
    return `The ${task} training objective is unavailable.`;
  }
  return null;
}

export function syncTaskObjective(
  graph: GraphJson, task: TaskType, components: Record<string, ComponentSpec>,
): string[] {
  const updates: string[] = [];
  if (graph.task !== task) updates.push(`Task → ${task}`);
  graph.task = task;
  const objective = components[`training.${task}_task`];
  for (const node of graph.nodes) {
    const previous = components[node.component];
    if (previous?.role !== 'training' || previous.tasks.includes(task) || !objective) continue;
    node.component = objective.id;
    node.params = Object.fromEntries(objective.parameters.flatMap((p) => {
      const current = node.params[p.name];
      if (current !== undefined && canMigrate(current, p)) return [[p.name, current]];
      return p.default == null ? [] : [[p.name, p.default as ParamValue]];
    }));
    updates.push(`Training objective → ${objective.name}`);
  }
  return updates;
}

export function reconcileReplacement(
  graph: GraphJson, target: GraphNode, previous: ComponentSpec, components: Record<string, ComponentSpec>,
  portTypes: PortTypeMeta[],
): string[] {
  const updates: string[] = [];
  const spec = components[target.component];
  const first = (role: string) => graph.nodes.find((node) => components[node.component]?.role === role);
  const item = first('item_encoder');
  const user = first('user_encoder');
  const predictor = first('predictor');
  const param = (node: GraphNode, name: string) => components[node.component].parameters.find((p) => p.name === name);
  const value = (node: GraphNode, name: string) => {
    const p = param(node, name);
    return p?.read_only ? p.default : (node.params[name] ?? p?.default);
  };
  const adjust = (node: GraphNode, name: string, next: ParamValue) => {
    if (JSON.stringify(value(node, name)) === JSON.stringify(next)) return;
    node.params[name] = next;
    updates.push(`${components[node.component].name} · ${name} → ${JSON.stringify(next)}`);
  };

  if (spec.tasks.length === 1 && (spec.role === 'predictor' || spec.role === 'training')) {
    updates.push(...syncTaskObjective(graph, spec.tasks[0] as TaskType, components));
  }

  const width = graph.train.hidden_size;
  for (const node of [item, user, predictor]) {
    if (node && typeof node.params.hidden_size === 'number') adjust(node, 'hidden_size', width);
  }
  if (item && item.id === target.id) {
    const fixed = param(item, 'item_hidden_size');
    const old = previous.parameters.find((p) => p.name === 'item_hidden_size');
    const next = fixed?.read_only ? (typeof fixed.default === 'number' ? fixed.default : null)
      : typeof item.params.item_hidden_size === 'number' ? item.params.item_hidden_size
        : old?.read_only ? null : graph.train.item_hidden_size;
    if (graph.train.item_hidden_size !== next) {
      graph.train.item_hidden_size = next;
      updates.push(`Training · item_hidden_size → ${next ?? (spec.id === 'item.externalhf' ? 'detected during preparation' : 'match hidden_size')}`);
    }
  }

  if (spec.role === 'item_encoder') {
    const dataset = first('dataset');
    const externalItem = spec.id === 'item.externalhf';
    const datasetExternal = dataset?.params.token_source === 'external_hf';
    const tokenizer = spec.source.tokenizer;
    const externalDataset = !externalItem && typeof tokenizer !== 'string' && datasetExternal;
    const vocab = externalItem || externalDataset ? 'external_hf' : tokenizer;
    if (dataset && typeof vocab === 'string') {
      if (!datasetExternal && param(dataset, 'lm')?.choices.includes(vocab)) adjust(dataset, 'lm', vocab);
      if (Array.isArray(dataset.params.item_inputs)) {
        adjust(dataset, 'item_inputs', rebindDatasetInputs(dataset.params.item_inputs, vocab, Boolean(externalDataset)));
      }
    } else if (dataset && previous.id === 'item.externalhf' && dataset.params.item_inputs != null) {
      adjust(dataset, 'item_inputs', null);
    }
  }

  const fitHeads = (node: GraphNode | undefined, name: string, widths: unknown[]) => {
    const p = node && param(node, name);
    if (!node || !p || p.read_only || !widths.every((w): w is number => typeof w === 'number' && w > 0)) return;
    const current = Number(value(node, name));
    if (current > 0 && widths.every((w) => w % current === 0)) return;
    let closest: number | undefined;
    for (let candidate = Math.max(1, p.minimum ?? 1); candidate <= Math.min(...widths, p.maximum ?? Infinity); candidate++) {
      if (widths.every((w) => w % candidate === 0) &&
          (closest === undefined || Math.abs(current - candidate) < Math.abs(current - closest))) closest = candidate;
    }
    if (closest !== undefined) adjust(node, name, closest);
  };
  const itemWidth = (item && value(item, 'item_hidden_size')) ?? graph.train.item_hidden_size ?? width;
  fitHeads(item, 'num_attention_heads', [itemWidth]);
  fitHeads(user, 'num_attention_heads', [!item || item.component === 'item.ada' ? itemWidth : width]);
  if (item) {
    const global = value(item, 'global_proj_size');
    const local = value(item, 'local_proj_size');
    if (typeof global === 'number' && typeof local === 'number' && global !== local) {
      adjust(item, 'local_proj_size', global);
    }
  }
  if (predictor?.component === 'predictor.autoint') {
    fitHeads(predictor, 'num_attention_heads', [value(predictor, 'attention_dim')]);
  }
  if (predictor?.component === 'predictor.finalmlp') {
    const widths = ['mlp1_hidden_units', 'mlp2_hidden_units'].map((name) => {
      const units = value(predictor, name);
      return Array.isArray(units) ? units.at(-1) : width;
    });
    fitHeads(predictor, 'num_heads', widths);
  }

  const accepts = (edge: GraphEdge) => {
    const source = graph.nodes.find((node) => node.id === edge.source);
    const receiver = graph.nodes.find((node) => node.id === edge.target);
    const out = source && components[source.component]?.outputs.find((port) => port.name === edge.sourceHandle);
    const input = receiver && components[receiver.component]?.inputs.find((port) => port.name === edge.targetHandle);
    return out && input && (portTypes.find((type) => type.id === input.type)?.accepts ?? [input.type]).includes(out.type);
  };
  const occupied = (edge: GraphEdge) => graph.edges.some((other) =>
    other.id !== edge.id && other.target === edge.target && other.targetHandle === edge.targetHandle && accepts(other));
  graph.edges = graph.edges.flatMap((edge) => {
    if ((edge.source !== target.id && edge.target !== target.id) || accepts(edge)) return [edge];
    const candidates = edge.source === target.id
      ? spec.outputs.map((port) => ({ ...edge, sourceHandle: port.name }))
      : spec.inputs.map((port) => ({ ...edge, targetHandle: port.name }));
    const compatible = candidates.filter((candidate) => accepts(candidate) && !occupied(candidate));
    if (compatible.length === 1) {
      const [next] = compatible;
      Object.assign(edge, next);
      updates.push(`Reconnected ${next.sourceHandle} → ${next.targetHandle}`);
      return [edge];
    }
    updates.push(`Reconnect ${edge.sourceHandle} → ${edge.targetHandle} manually`);
    return [];
  });
  return updates;
}

export function rebindDatasetInputs(inputs: ParamValue, vocab: string, keepOther: boolean): DatasetInput[] | null {
  if (!Array.isArray(inputs) || !inputs.every(isDatasetInput)) return null;
  let hasText = false;
  const converted = inputs.flatMap((entry) => {
    const source = entry.column.split(/--?>/, 1)[0].trim();
    if (!source.includes('@')) return keepOther ? [entry] : [];
    hasText = true;
    const column = entry.column.replace(source, source.split('@', 1)[0] + `@${vocab}`);
    return [{ ...entry, column }];
  });
  return hasText && new Set(converted.map((entry) => entry.column)).size === converted.length ? converted : null;
}

function isDatasetInput(value: unknown): value is DatasetInput {
  return typeof value === 'object' && value !== null && 'column' in value && typeof value.column === 'string';
}
