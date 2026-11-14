import {
  Activity,
  BarChart3,
  Box,
  Boxes,
  Brain,
  CircleDot,
  Database,
  FileText,
  GitBranch,
  Layers,
  Minus,
  Network,
  Sparkles,
  Target,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { CategoryId } from '@/types/catalog';

export const ICONS: Record<string, LucideIcon> = {
  Database, Layers, FileText, Users, Target, Zap, BarChart3, Box, Boxes,
  Brain, CircleDot, GitBranch, Minus, Network, Sparkles, Activity,
};

export function iconFor(name?: string): LucideIcon {
  return ICONS[name || ''] || Box;
}

export const CATEGORY_COLORS: Record<CategoryId, string> = {
  dataset: '#3b82f6',
  feature: '#0d9488',
  item_encoder: '#16a34a',
  user_encoder: '#ea580c',
  predictor: '#7c3aed',
  training: '#e11d48',
  evaluation: '#0891b2',
};

export const PORT_COLORS: Record<string, string> = {
  Dataset: '#3b82f6',
  ItemContent: '#3b82f6',
  ItemEmbedding: '#16a34a',
  ItemEmbeddingSequence: '#16a34a',
  CandidateItemEmbedding: '#16a34a',
  FeatureEmbedding: '#0d9488',
  UserEmbedding: '#ea580c',
  PredictionScore: '#7c3aed',
  TrainingConfig: '#e11d48',
  TrainingData: '#e11d48',
  EvaluationResult: '#0891b2',
  MetricsConfig: '#0891b2',
};

export function hexAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function shortType(type: string): string {
  return type
    .replace('Embedding', ' Emb.')
    .replace('Sequence', ' Seq.')
    .replace('PredictionScore', 'Score')
    .replace('EvaluationResult', 'Result')
    .replace('CandidateItem Emb.', 'Candidate')
    .slice(0, 22);
}

export function fmt(value: unknown): string {
  if (Array.isArray(value)) return `[${value.join(', ')}]`;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function timeAgo(seconds: number): string {
  const diff = Math.max(0, Date.now() / 1000 - seconds);
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(seconds * 1000).toLocaleDateString();
}
