export type TaskType = 'matching' | 'ranking';

export interface DatasetInput {
  column: string;
  truncate: number | null;
}

export type ParamValue = string | number | boolean | number[] | string[] | DatasetInput[] | Record<string, unknown> | null;

export interface Position {
  x: number;
  y: number;
}

export interface GraphNode {
  id: string;
  component: string;
  type?: string | null;
  params: Record<string, ParamValue>;
  position: Position;
  label?: string | null;
}

export interface GraphEdge {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
}

export interface TrainConfig {
  batch_size: number;
  accumulate_batch: number;
  lr: number;
  hidden_size: number;
  item_hidden_size: number | null;
  epochs: number;
  device: 'cpu' | 'cuda' | 'auto';
  cuda_index: number | null;
  metrics: string[];
  dev_metric: string;
  patience: number;
  seed: number;
  simple_dev: boolean;
  extra_cli: Record<string, string>;
}

export interface GraphJson {
  graph_id: string;
  name: string;
  task: TaskType;
  description: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  train: TrainConfig;
  template_id: string | null;
  schema_version: string;
}

export const DEFAULT_TRAIN: TrainConfig = {
  batch_size: 64,
  accumulate_batch: 1,
  lr: 0.001,
  hidden_size: 256,
  item_hidden_size: null,
  epochs: 1,
  device: 'cpu',
  cuda_index: null,
  metrics: ['GAUC', 'MRR', 'NDCG@1', 'NDCG@5', 'NDCG@10'],
  dev_metric: 'GAUC',
  patience: 5,
  seed: 2023,
  simple_dev: false,
  extra_cli: {},
};

export function emptyGraph(name = 'Untitled Recommender'): GraphJson {
  return {
    graph_id: `model_${Date.now().toString(36)}`,
    name,
    task: 'matching',
    description: '',
    nodes: [],
    edges: [],
    train: { ...DEFAULT_TRAIN, metrics: [...DEFAULT_TRAIN.metrics], extra_cli: {} },
    template_id: null,
    schema_version: '1.0',
  };
}
