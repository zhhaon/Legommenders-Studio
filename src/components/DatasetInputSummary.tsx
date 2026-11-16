import { useMemo } from 'react';
import { text, tr, useLocale } from '@/i18n';
import { useDatasetPreview } from '@/hooks/useDatasetPreview';
import { datasetColumnLabel, datasetInputRows } from '@/utils/datasetInputRows';
import type { ComponentSpec } from '@/types/catalog';
import type { DatasetInput, GraphNode, ParamValue } from '@/types/graph';

/** Resolve component defaults independently of the current graph and its item encoder. */
export function DatasetInputSummary({ component }: { component: ComponentSpec }) {
  useLocale();
  const node = useMemo<GraphNode>(() => ({
    id: 'dataset_preview', component: component.id, position: { x: 0, y: 0 },
    params: Object.fromEntries(component.parameters.filter(param => param.default != null).map(param => [param.name, param.default as ParamValue])),
  }), [component]);
  const type = component.parameters.find(param => param.name === 'item_inputs')?.type || 'list';
  const state = useDatasetPreview(node);
  const configured = node.params.item_inputs as DatasetInput[] | null | undefined;
  const rows = state?.preview
    ? datasetInputRows(configured, state.preview.defaults, state.preview.columns) : configured;
  return <div className="min-w-0 flex-1 space-y-1 text-right text-[10px] text-muted">
    <div>{text(type)} {tr('ui._default_0044b4')}</div>
    {rows ? rows.length ? rows.map((row, index) => <div key={index} data-item-column={datasetColumnLabel(row.column)}
      data-item-truncate={row.truncate ?? ''} className="flex items-start justify-end gap-2">
      <span className="min-w-0 break-words">{datasetColumnLabel(row.column)}</span>
      <span className="shrink-0">{row.truncate ?? tr('ui.full_10b28a')}</span>
    </div>) : <p>{tr('ui.no_item_inputs_b9616d')}</p>
      : <p>{state?.error ? tr('messages.bf8640ced7ef', { p0: state.error }) : tr('ui.loading_item_inputs__138313')}</p>}
  </div>;
}

