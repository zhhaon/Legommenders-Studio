import type { RunRecord } from '@/types/api';

const DATASETS = ['automotive', 'books', 'cds', 'ebnerd', 'goodreads', 'hm', 'microlens', 'mind', 'netflix', 'pens', 'lastfm', 'yelp'];
export function datasetMatch(dataset: string): { key: string | null; blocked: boolean } {
  const path = dataset.replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase();
  if (/mind-demo|oncemind|xmind/.test(path)) return { key: null, blocked: true };
  for (const key of DATASETS) {
    if ([key, `${key}rb`, `config/data/${key}.yaml`, `config/recbench/${key}.yaml`].includes(path)) return { key, blocked: false };
  }
  return { key: null, blocked: false };
}
export function runLM(run: RunRecord): string {
  return String(run.graph?.nodes.find(node => node.component.startsWith('dataset.'))?.params.lm ?? run.params.lm ?? '—');
}
export function orderedMetrics(names: string[]): string[] {
  const order = ['GAUC', 'MRR', 'NDCG@1', 'NDCG@5', 'NDCG@10'];
  return [...new Set(names)].sort((a, b) => {
    const ai = order.indexOf(a), bi = order.indexOf(b);
    return (ai < 0 ? order.length : ai) - (bi < 0 ? order.length : bi) || a.localeCompare(b, undefined, { numeric: true });
  });
}
export function finite(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
export function formatScore(value: unknown): string { return finite(value) ? value.toFixed(4) : '—'; }
export function baselineDelta(value: unknown, mean: unknown, sameDataset: boolean): string | null {
  if (!sameDataset || !finite(value) || !finite(mean)) return null;
  const delta = value - mean;
  return `${delta >= 0 ? '+' : ''}${delta.toFixed(4)}`;
}
