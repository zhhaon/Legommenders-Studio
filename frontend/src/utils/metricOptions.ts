import type { MetricSpec } from '@/types/catalog';

/** Dev monitoring uses the same concrete metric syntax as evaluation. */
export function devMetricOptions(catalog: MetricSpec[], selected: string[], current: string): string[] {
  const supported = catalog.map((spec) => spec.argument
    ? `${spec.name}@${spec.argument === 'threshold' ? '0.5' : '10'}` : spec.name);
  return [...new Set([...selected, current, ...supported])];
}

export function selectDevMetric(metrics: string[], value: string) {
  return { dev_metric: value, metrics: metrics.includes(value) ? metrics : [...metrics, value] };
}
