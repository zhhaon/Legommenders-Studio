import type { BenchmarkIndex, OfficialEvaluation } from '@/types/benchmark';
import { registerMessages } from '@/i18n';
import type {
  CompatibleEntry,
  CompileResult,
  EnvironmentReport,
  LogsResponse,
  RunRecord,
  ValidationReport,
} from '@/types/api';
import type { ComponentCatalog, TemplateSummary } from '@/types/catalog';
import type { DatasetInput, GraphJson } from '@/types/graph';

import { demoRequest } from '@/demo/adapter';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const result = await demoRequest(path, init?.body ? JSON.parse(String(init.body)) : undefined);
  registerMessages(result);
  return result as T;
}

const post = <T>(path: string, body: unknown): Promise<T> =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) });

export const api = {
  benchmark: () => request<BenchmarkIndex>('/benchmark/evaluations'),
  benchmarkDetail: (signature: string) => request<{ evaluation: OfficialEvaluation; source: string }>(`/benchmark/evaluations/${encodeURIComponent(signature)}`),
  health: () => request<{ status: string }>('/health'),
  components: () => request<ComponentCatalog>('/components'),
  compatible: (componentId: string, direction: 'upstream' | 'downstream' = 'downstream') =>
    request<{ results: CompatibleEntry[] }>(
      `/components/${encodeURIComponent(componentId)}/compatible?direction=${direction}`,
    ),
  templates: () => request<{ templates: TemplateSummary[] }>('/templates'),
  template: (id: string) => request<TemplateSummary>(`/templates/${encodeURIComponent(id)}`),
  datasetInputs: (graph: Pick<GraphJson, 'nodes'>) =>
    post<{ defaults: DatasetInput[]; columns: string[] }>('/graph/dataset-inputs', graph),
  validate: (graph: GraphJson) => post<ValidationReport>('/graph/validate', graph),
  compile: (graph: GraphJson) => post<CompileResult>('/graph/compile', graph),
  importGraph: (payload: { graph?: unknown; yaml?: string }) =>
    post<{ graph: GraphJson; validation: ValidationReport }>('/graph/import', payload),
  environment: () => request<EnvironmentReport>('/environment'),
  verify: (graph: GraphJson) =>
    post<{ model_label: string; yaml_text: string; notes: string[]; compatible: boolean; validation: ValidationReport }>(
      '/diagnostics/verify', graph,
    ),
  train: (graph: GraphJson, preflightOnly = false, hfToken?: string) =>
    request<RunRecord>('/train', {
      method: 'POST',
      headers: hfToken && !preflightOnly ? { 'X-Hugging-Face-Token': hfToken } : undefined,
      body: JSON.stringify({ graph, preflight_only: preflightOnly }),
    }),
  evaluate: (graph: GraphJson, runId?: string) =>
    post<RunRecord>('/evaluate', { graph, run_id: runId || null }),
  runStatus: (runId: string) => request<RunRecord>(`/train/${runId}/status`),
  runLogs: (runId: string, after = 0) => request<LogsResponse>(`/train/${runId}/logs?after=${after}`),
  cancel: (runId: string) => post<RunRecord>(`/train/${runId}/cancel`, {}),
  deleteRun: (runId: string) => request<{ deleted: boolean }>(`/runs/${encodeURIComponent(runId)}`, { method: 'DELETE' }),
  runs: () => request<{ runs: RunRecord[] }>('/runs'),
  run: (runId: string) => request<RunRecord>(`/runs/${runId}`),
  saveGraph: (graph: GraphJson) => post<{ saved: boolean; graph_id: string }>('/graphs/save', { graph }),
  savedGraphs: () => request<{ graphs: { graph_id: string; name: string; task: string; nodes: number; saved_at: number }[] }>('/graphs'),
  loadGraph: (graphId: string) =>
    request<{ graph: GraphJson; validation: ValidationReport }>(`/graphs/${encodeURIComponent(graphId)}`),
  referenceYaml: (relative: string) => request<string>(`/reference/${relative}`),
};

export function downloadText(filename: string, content: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
