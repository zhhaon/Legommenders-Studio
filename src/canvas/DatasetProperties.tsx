import { tr, useLocale } from '@/i18n';
import { useDatasetPreview } from '@/hooks/useDatasetPreview';
import type { DatasetInput, GraphNode } from '@/types/graph';

export function DatasetProperties({ node, itemComponent }: { node: GraphNode; itemComponent?: string }) {
  useLocale();
  const state = useDatasetPreview(node, itemComponent);
  const inputs = node.params.item_inputs as DatasetInput[] | null | undefined;
  const rows = inputs ?? state?.preview?.defaults;
  return <div data-param-name="item_inputs" className="space-y-1 text-[9.5px]">
    <div className="font-medium">{tr("ui.item_inputs_97a936")}</div>
    {rows ? rows.length ? rows.map((row, index) => <div key={index} className="flex items-start justify-end gap-2 text-right">
      <span className="min-w-0 break-words">{row.column.replace(/@[^ ]+/g, '')}</span>
      {row.truncate != null && <span className="shrink-0">{row.truncate}</span>}
    </div>) : <p className="pl-2">{tr("ui.no_item_inputs_b9616d")}</p>
      : <p className="pl-2">{state?.error ? tr("messages.bf8640ced7ef", { p0: state.error }) : tr("ui.loading_item_inputs__138313")}</p>}
  </div>;
}
