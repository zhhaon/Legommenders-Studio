import type { ComponentSpec, ParamSpec } from '@/types/catalog';

/** Visibility rules for the standard parameter fields in the Properties panel. */
export function propertyParameterVisible(
  component: Pick<ComponentSpec, 'role'> | undefined, name: string, itemOwnsTokens = false,
): boolean {
  if (component?.role !== 'dataset') return true;
  if (['token_source', 'data_config', 'embed_config'].includes(name) || name.startsWith('external_')) return false;
  return name !== 'lm' || !itemOwnsTokens;
}

/** All visible fields, including dataset fields rendered with dedicated controls. */
export function visiblePropertyParameters(component: ComponentSpec, itemOwnsTokens = false): ParamSpec[] {
  return component.parameters.filter(param => {
    if (component.role === 'dataset' && ['item_inputs', 'lm'].includes(param.name)) return true;
    return param.name !== 'item_inputs' && propertyParameterVisible(component, param.name, itemOwnsTokens);
  });
}

/** Ordinary fields only; the remaining visible fields have dedicated sidebar controls. */
export function standardPropertyParameters(component: ComponentSpec, itemOwnsTokens = false): ParamSpec[] {
  return visiblePropertyParameters(component, itemOwnsTokens).filter(param => param.name !== 'item_inputs'
    && !(component.role === 'dataset' && param.name === 'lm' && itemOwnsTokens));
}
