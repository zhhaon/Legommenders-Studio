import type { GraphJson, TaskType } from './graph';

export type CategoryId =
  | 'dataset'
  | 'feature'
  | 'item_encoder'
  | 'user_encoder'
  | 'predictor'
  | 'training'
  | 'evaluation';

export type ParamKind = 'integer' | 'number' | 'boolean' | 'string' | 'enum' | 'list' | 'object' | 'number_or_list' | 'string_or_list';

export interface PortSpec {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface ParamSpec {
  name: string;
  type: ParamKind;
  default: unknown;
  nullable?: boolean;
  read_only?: boolean;
  default_hint?: string | null;
  required: boolean;
  minimum: number | null;
  maximum: number | null;
  choices: string[];
  description: string;
  source: 'introspected' | 'curated' | 'dataset';
  config_path: string;
  advanced: boolean;
}

export interface ComponentSpec {
  id: string;
  name: string;
  category: CategoryId;
  role: string;
  description: string;
  icon: string;
  status: 'verified' | 'available' | 'conceptual';
  executable: boolean;
  conceptual: boolean;
  backend_class: string | null;
  meta_value: string | null;
  inputs: PortSpec[];
  outputs: PortSpec[];
  parameters: ParamSpec[];
  tasks: string[];
  source: Record<string, unknown>;
  detail: string;
  status_note: string;
}

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  color: string;
  icon: string;
  description: string;
}

export interface PortTypeMeta {
  id: string;
  label: string;
  color: string;
  accepts: string[];
  description: string;
}

export interface MetricSpec {
  name: string;
  argument: 'cutoff' | 'threshold' | null;
}

export interface ComponentCatalog {
  components: ComponentSpec[];
  metrics?: MetricSpec[];
  categories: CategoryMeta[];
  port_types: PortTypeMeta[];
  generated_from: string;
}

export interface TemplateSummary {
  id: string;
  name: string;
  yaml: string;
  task: TaskType;
  year: number;
  description: string;
  paper: string;
  featured: boolean;
  source_yaml: string;
  available: boolean;
  error?: string;
  graph?: GraphDef;
  resolved_config?: Record<string, unknown>;
  verified_by?: string;
}

export type GraphDef = GraphJson;
