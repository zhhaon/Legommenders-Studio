import { parameterDefault } from '@/utils/parameterDefault';
import type { ComponentSpec, ParamSpec } from '@/types/catalog';
import type { ValidationIssue } from '@/types/api';
import i18next, { tr, text } from './index';

export function componentText(component: ComponentSpec | null | undefined, field: 'name' | 'description' | 'detail' | 'status_note' = 'name'): string {
  if (!component) return '';
  return tr('catalog.' + component.id + '.' + field, {}, component[field]);
}
export function paramLabel(name: string): string {
  return tr('params.' + name + '.label', {}, name.replace(/^external_/, '').replace(/_/g, ' '));
}
export function paramDescription(param: ParamSpec): string {
  return tr('params.' + param.name + '.description', {}, param.description);
}
export function categoryLabel(category: string): string {
  return tr('categories.' + category, {}, category.replace(/_/g, ' '));
}
export function issueText(issue: ValidationIssue, field: 'message' | 'reason' | 'fix' = 'message'): string {
  const ref = issue.translations?.[field];
  return ref ? tr(ref.key, ref.params, issue[field]) : text(issue[field]);
}
export function detailText(value?: string): string {
  if (!value) return '';
  const negative = /^Negative Candidate (\d+)$/.exec(value);
  if (negative) return tr('canvas.negativeCandidate', { count: Number(negative[1]) });
  const candidates = /^Candidates · 1 positive \+ (\d+) negatives$/.exec(value);
  if (candidates) return tr('canvas.candidates', { count: Number(candidates[1]) });
  const scores = /^(\d+) scores · cross entropy$/.exec(value);
  if (scores) return tr('canvas.scores', { count: Number(scores[1]) });
  if (value.startsWith('Disconnected · ')) return tr('canvas.disconnected', { detail: detailText(value.slice(15)) });
  return text(value);
}
export function formatTime(seconds: number): string {
  const diff = Math.max(0, Date.now() / 1000 - seconds);
  const locale = i18next.resolvedLanguage || 'en';
  for (const [limit, divisor, unit] of [[60, 1, 'second'], [3600, 60, 'minute'], [86400, 3600, 'hour']] as const) {
    if (diff < limit) return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-Math.floor(diff / divisor), unit);
  }
  return new Intl.DateTimeFormat(locale).format(new Date(seconds * 1000));
}


export function parameterDefaultText(component: ComponentSpec, param: ParamSpec): string {
  const result = parameterDefault(component, param);
  if (result.kind === 'value') return JSON.stringify(result.value);
  if (result.kind === 'runtime') return tr('defaults.runtime');
  if (result.kind === 'required') return tr('defaults.required');
  return text(result.hint);
}
