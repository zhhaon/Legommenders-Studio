import { describe, expect, it } from 'vitest';
import type { ComponentSpec, ParamSpec } from '@/types/catalog';
import { parameterDefault } from './parameterDefault';

const hidden = { name: 'hidden_size', default: 256 } as ParamSpec;
const component = { parameters: [hidden] } as ComponentSpec;
const param = (defaultValue: unknown, extra: Partial<ParamSpec> = {}): ParamSpec => ({ name: 'test', default: defaultValue, ...extra } as ParamSpec);

describe('component default display', () => {
  it('preserves explicit falsy values and optional nulls', () => {
    for (const value of [0, false, '', [], null]) expect(parameterDefault(component, param(value))).toEqual({ kind: 'value', value });
  });
  it('resolves automatic defaults using the registry hidden size rather than project settings', () => {
    const cases: [string, unknown][] = [['Matches hidden_size', 256], ['[hidden_size]', [256]], ['Three layers of hidden_size', [256, 256, 256]], ['[8 × hidden_size, 2 × hidden_size, hidden_size]', [2048, 512, 256]]];
    for (const [hint, expected] of cases) {
      const source = param(null, { default_hint: hint });
      expect(parameterDefault(component, source)).toEqual({ kind: 'value', value: expected });
      expect(source.default).toBeNull();
    }
    expect(hidden.default).toBe(256);
  });
  it('does not invent a value for runtime detection or a required unset field', () => {
    expect(parameterDefault(component, param(null, { default_hint: 'Detected from the pretrained token embedding matrix' }))).toEqual({ kind: 'runtime' });
    expect(parameterDefault(component, param(null, { required: true }))).toEqual({ kind: 'required' });
  });
});
