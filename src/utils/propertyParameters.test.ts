import { describe, expect, it } from 'vitest';
import type { ComponentSpec, ParamSpec } from '@/types/catalog';
import { visiblePropertyParameters, standardPropertyParameters, propertyParameterVisible } from './propertyParameters';

const parameter = (name: string, extra: Partial<ParamSpec> = {}): ParamSpec => ({ name, ...extra } as ParamSpec);
const component = (role: string, parameters: ParamSpec[]): ComponentSpec => ({ role, parameters } as ComponentSpec);

describe('visible component properties', () => {
  const dataset = component('dataset', ['data_config', 'embed_config', 'token_source', 'external_model_id', 'item_inputs', 'lm', 'lang'].map(name => parameter(name)));
  it('includes the item-input section while omitting hidden dataset resources', () => {
    expect(visiblePropertyParameters(dataset).map(p => p.name)).toEqual(['item_inputs', 'lm', 'lang']);
    expect(standardPropertyParameters(dataset).map(p => p.name)).toEqual(['lm', 'lang']);
  });
  it('includes the separately displayed managed language model once', () => {
    expect(visiblePropertyParameters(dataset, true).map(p => p.name)).toEqual(['item_inputs', 'lm', 'lang']);
    expect(standardPropertyParameters(dataset, true).map(p => p.name)).toEqual(['lang']);
    expect(propertyParameterVisible(dataset, 'lm', true)).toBe(false);
  });
  it('retains visible advanced settings and read-only values', () => {
    const item = component('item_encoder', [parameter('model_id'), parameter('item_hidden_size', { read_only: true }), parameter('use_lora', { advanced: true })]);
    expect(visiblePropertyParameters(item).map(p => p.name)).toEqual(['model_id', 'item_hidden_size', 'use_lora']);
    expect(propertyParameterVisible(item, 'external_model_id', true)).toBe(true);
  });
});
