import type { CompileResult, EnvironmentReport, LogsResponse, RunRecord } from '@/types/api';
import type { DatasetInput, GraphJson } from '@/types/graph';
import { catalog, templates, references, components, clone, parseGraph, validateGraph, readSaves, saveGraph } from '@/demo/runtime';

const unavailable = async <T,>(): Promise<T> => { throw new Error('Disabled in this static demo: this feature requires the Legommenders Python backend.'); };
export const api = {
  health: async () => ({ status: 'static-demo' }),
  components: async () => clone(catalog),
  templates: async () => ({ templates: clone(templates) }),
  template: async (id: string) => {
    const template = templates.find((t) => t.id === id);
    if (!template) throw new Error('Unknown template.');
    return clone(template);
  },
  compatible: async (id: string, direction: 'upstream' | 'downstream' = 'downstream') => {
    const selected = components[id];
    const accepts = (input: string, output: string) => (catalog.port_types.find((p) => p.id === input)?.accepts ?? [input]).includes(output);
    return { results: catalog.components.filter((c) => selected && (direction === 'downstream'
      ? selected.outputs.some((out) => c.inputs.some((input) => accepts(input.type, out.type)))
      : selected.inputs.some((input) => c.outputs.some((out) => accepts(input.type, out.type)))))
      .map((c) => ({ id: c.id, name: c.name, category: c.category, description: c.description, status: c.status, conceptual: c.conceptual, reasons: ['Compatible static port types; runtime compatibility is not checked.'] })) };
  },
  datasetInputs: async (graph: Pick<GraphJson, 'nodes'>): Promise<{ defaults: DatasetInput[]; columns: string[] }> => {
    const dataset = graph.nodes.find((n) => components[n.component]?.role === 'dataset');
    const vocab = dataset?.params.token_source === 'external_hf' ? 'external_hf' : String(dataset?.params.lm || 'glove');
    const columns = [`title@${vocab}`, `abstract@${vocab}`, 'category', 'subcategory'];
    return { defaults: [{ column: columns[0], truncate: 30 }], columns };
  },
  validate: async (graph: GraphJson) => validateGraph(graph),
  importGraph: async (payload: { graph?: unknown; yaml?: string }) => {
    if (payload.yaml !== undefined) return unavailable<{ graph: GraphJson; validation: ReturnType<typeof validateGraph> }>();
    const graph = parseGraph(payload.graph);
    return { graph, validation: validateGraph(graph) };
  },
  environment: async (): Promise<EnvironmentReport> => ({ python: 'unavailable', executable: '', torch: 'unavailable', cuda_available: false, cuda_device_count: 0, device_name: null, dependencies: {}, trainer_script: false, data_root_exists: false, datasets: [], embeddings: [], warnings: ['Static browser demo: no server, training, evaluation, compilation or resource access.'] }),
  runs: async () => ({ runs: [] as RunRecord[] }),
  saveGraph: async (graph: GraphJson) => saveGraph(graph),
  savedGraphs: async () => ({ graphs: Object.entries(readSaves()).map(([graph_id, value]) => ({ graph_id, name: value.graph.name, task: value.graph.task, nodes: value.graph.nodes.length, saved_at: value.saved_at })).sort((a, b) => a.saved_at - b.saved_at) }),
  loadGraph: async (id: string) => {
    const entry = readSaves()[id];
    if (!entry) throw new Error('Project not found in this browser.');
    const graph = parseGraph(entry.graph);
    return { graph, validation: validateGraph(graph) };
  },
  referenceYaml: async (relative: string) => references[relative] || '',
  compile: (_graph: GraphJson) => unavailable<CompileResult>(),
  verify: (_graph: GraphJson) => unavailable<{ model_label: string; yaml_text: string; notes: string[]; compatible: boolean; validation: ReturnType<typeof validateGraph> }>(),
  train: (_graph: GraphJson, _preflightOnly = false, _hfToken?: string) => unavailable<RunRecord>(),
  evaluate: (_graph: GraphJson, _runId?: string) => unavailable<RunRecord>(),
  runStatus: (_id: string) => unavailable<RunRecord>(),
  runLogs: (_id: string, _after = 0) => unavailable<LogsResponse>(),
  cancel: (_id: string) => unavailable<RunRecord>(),
  run: (_id: string) => unavailable<RunRecord>(),
};

export function downloadText(filename: string, content: string, mime = 'text/plain') {
  const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
