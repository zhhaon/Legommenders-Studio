import type { ComponentSpec } from '@/types/catalog';
import type { GraphNode } from '@/types/graph';

export function tokenResources(
  dataset: GraphNode | null | undefined, datasetSpec: ComponentSpec | undefined,
  item: GraphNode | undefined, itemSpec: ComponentSpec | undefined,
) {
  const value = (name: string) => dataset?.params[name]
    ?? datasetSpec?.parameters.find((param) => param.name === name)?.default;
  const externalItem = itemSpec?.id === 'item.externalhf';
  const checkpoint = itemSpec?.source.checkpoint;
  const managedByItem = externalItem || typeof checkpoint === 'string';
  const externalDataset = !managedByItem && value('token_source') === 'external_hf';
  if (externalItem || externalDataset) {
    const model = externalItem ? item?.params.model_id : value('external_model_id');
    const tokenizer = externalItem ? item?.params.tokenizer_id : value('external_tokenizer_id');
    return {
      managedByItem,
      externalDataset,
      lm: String(tokenizer || model || 'Configure the Hugging Face model'),
      embeddings: String(model || 'Configure the Hugging Face model'),
      owner: managedByItem ? 'Item Encoder' : 'Dataset',
    };
  }
  return {
    managedByItem,
    externalDataset,
    lm: String(managedByItem ? itemSpec?.source.tokenizer : value('lm') || 'glove'),
    embeddings: String(managedByItem ? checkpoint : value('embed_config') || 'config/embed/null.yaml'),
    owner: managedByItem ? 'Item Encoder' : 'Dataset',
  };
}
