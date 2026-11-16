import type { ComponentSpec } from '@/types/catalog';
import type { GraphJson, GraphNode } from '@/types/graph';
const positive = (value: unknown): number | null => typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
export function vectorDimension(graph: GraphJson, node: GraphNode | undefined, spec: ComponentSpec | undefined, input: number | null, columns?: number): number | null {
  if (!node || !spec || spec.category === 'dataset') return input;
  const name = String(spec.source?.class || spec.backend_class || spec.meta_value || node.component).toLowerCase().replace(/operator$/, '');
  const hidden = positive(node.params.hidden_size) ?? positive(graph.train.hidden_size);
  if (name.includes('cnncat')) return hidden && columns ? hidden * columns : null;
  if (['ada', 'polyattention', 'singlecolumn'].some(kind => name === kind || name.endsWith(`.${kind}`))) return spec.role === 'item_encoder' && spec.source?.checkpoint ? null : input;
  return hidden;
}
