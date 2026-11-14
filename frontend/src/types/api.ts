import type { GraphJson } from './graph';

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  code: string;
  severity: IssueSeverity;
  message: string;
  reason: string;
  fix: string;
  node_id: string | null;
  edge_id: string | null;
}

export interface ValidationSummary {
  nodes: number;
  edges: number;
  task: string;
  model_label: string;
  exact_template: string | null;
  dataset: string | null;
  item_encoder: string | null;
  user_encoder: string | null;
  predictor: string | null;
}

export interface ValidationReport {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  runtime_checks: ValidationIssue[];
  summary: ValidationSummary;
}

export interface CompileResult {
  yaml_text: string;
  model_dict: Record<string, unknown>;
  model_label: string;
  exact_template: string | null;
  reference_yaml: string | null;
  notes: string[];
  generated_file: string | null;
  data_config: string | null;
  exp_config: string | null;
  embed_config: string | null;
  validation: ValidationReport;
  compatible_with_reference: boolean;
}

export type RunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface CurvePoint {
  epoch: number;
  step: number | null;
  value: number;
  metric: string;
}

export interface TokenResourceInfo {
  owner: 'dataset' | 'item_encoder';
  model_id: string;
  revision: string;
  tokenizer_id: string;
  tokenizer_revision: string;
  embedding_width: number;
}

export interface RunRecord {
  run_id: string;
  kind: 'train' | 'evaluate';
  status: RunStatus;
  experiment_name: string;
  model_label: string;
  dataset: string;
  task: string;
  created_at: number;
  started_at: number | null;
  finished_at: number | null;
  exit_code: number | null;
  error: string;
  blockers: string[];
  command: string[];
  config: Record<string, unknown> & { token_resources?: TokenResourceInfo };
  params: Record<string, unknown>;
  metrics: Record<string, number>;
  loss_curve: CurvePoint[];
  validation_curve: CurvePoint[];
  log_offset?: number;
  log_lines: string[];
  log_file: string;
  result_file: string;
  signature: string;
  graph: GraphJson | null;
  model_yaml: string;
}

export interface LogsResponse {
  replace_from?: number;
  run_id: string;
  status: RunStatus;
  lines: string[];
  next: number;
  error: string;
  metrics: Record<string, number>;
}

export interface EnvironmentReport {
  https_port?: number | null;
  python: string;
  executable: string;
  torch: string;
  cuda_available: boolean;
  cuda_device_count: number;
  cuda_devices?: { index: number; name: string }[];
  device_name: string | null;
  dependencies: Record<string, string>;
  trainer_script: boolean;
  data_root_exists: boolean;
  datasets: { config: string; config_exists: boolean; files_present: boolean }[];
  embeddings: { config: string; path: string; present: boolean }[];
  warnings: string[];
}

export interface CompatibleEntry {
  id: string;
  name: string;
  category: string;
  description: string;
  status: string;
  conceptual: boolean;
  reasons: string[];
}
