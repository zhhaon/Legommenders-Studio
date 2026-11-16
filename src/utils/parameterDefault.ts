import type { ComponentSpec, ParamSpec } from '@/types/catalog';

export type ParameterDefault = { kind: 'value'; value: unknown }
  | { kind: 'runtime' } | { kind: 'required' }
  | { kind: 'hint'; hint: string };

/** Use registry defaults only; never resolve automatic defaults against graph/train state. */
export function parameterDefault(component: ComponentSpec, param: ParamSpec): ParameterDefault {
  if (param.default != null) return { kind: 'value', value: param.default };
  const hidden = component.parameters.find(candidate => candidate.name === 'hidden_size')?.default;
  if (typeof hidden === 'number') {
    if (param.default_hint === 'Matches hidden_size') return { kind: 'value', value: hidden };
    if (param.default_hint === '[hidden_size]') return { kind: 'value', value: [hidden] };
    if (param.default_hint === 'Three layers of hidden_size') return { kind: 'value', value: [hidden, hidden, hidden] };
    if (param.default_hint === '[8 × hidden_size, 2 × hidden_size, hidden_size]') return { kind: 'value', value: [hidden * 8, hidden * 2, hidden] };
  }
  if (param.default_hint === 'Detected from the pretrained token embedding matrix') return { kind: 'runtime' };
  if (param.default_hint) return { kind: 'hint', hint: param.default_hint };
  if (param.required) return { kind: 'required' };
  return { kind: 'value', value: param.default ?? null };
}
