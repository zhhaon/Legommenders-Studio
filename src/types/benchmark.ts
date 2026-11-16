export interface BenchmarkExperiment {
  seed: number;
  is_completed: boolean;
  performance: Record<string, number | null> | null;
  created_at: string;
  completed_at: string;
}
export interface OfficialEvaluation {
  signature: string;
  command: string;
  comment: string;
  created_at: string;
  modified_at: string;
  experiments: BenchmarkExperiment[];
  configuration?: unknown;
}
export interface BenchmarkEntry extends OfficialEvaluation {
  model: string;
  dataset: string;
  lm: string;
  completed: number;
  params: Record<string, string>;
  metrics: Record<string, { mean: number; std: number | null; count: number }>;
}
export interface BenchmarkIndex {
  evaluations: BenchmarkEntry[];
  total: number;
  source: string;
  fetched_at: number;
  cache_seconds: number;
}
