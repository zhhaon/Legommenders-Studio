import { tr, useLocale } from '@/i18n';
import { useState } from 'react';
import { useDatasetPreview } from '@/hooks/useDatasetPreview';
import { datasetColumnLabel, datasetInputRows } from '@/utils/datasetInputRows';
import { useStudio } from '@/store/graphStore';
import type { DatasetInput, GraphNode } from '@/types/graph';

export function DatasetInputs({ node }: { node: GraphNode }) {
  useLocale();
  const itemComponent = useStudio((s) => s.graph.nodes.find((n) => n.component.startsWith('item.'))?.component);
  const updateParam = useStudio((s) => s.updateParam);
  const { item_inputs } = node.params;
  const state = useDatasetPreview(node, itemComponent);

  return (
    <section data-property-parameter="item_inputs" aria-label={tr("ui.dataset_item_inputs_368dcb")} className="rounded-lg border border-line p-2">
      <p className="field-help">{tr('demo.columns')}</p>
      <h4 className="field-label">{tr("ui.dataset_item_inputs_368dcb")}</h4>
      <p className="field-help">{tr("ui.choose_ordered_dataset_attributes_and_maximum_length_129948")}</p>
      {state?.error ? <p role="alert" className="text-[10px] text-red-600">{state.error}</p>
        : state?.preview ? (
          <InputRows
            key={state.request + JSON.stringify(item_inputs)}
            initial={datasetInputRows(item_inputs as DatasetInput[] | null | undefined, state.preview.defaults, state.preview.columns)}
            columns={state.preview.columns}
            custom={item_inputs != null}
            onSave={(inputs) => updateParam(node.id, 'item_inputs', inputs)}
          />
        ) : <p className="field-help">{tr("ui.loading_item_inputs__138313")}</p>}
    </section>
  );
}

function InputRows({ initial, columns, custom, onSave }: {
  initial: DatasetInput[];
  columns: string[];
  custom: boolean;
  onSave: (inputs: DatasetInput[] | null) => void;
}) {
  useLocale();
  const [rows, setRows] = useState(initial);
  const label = datasetColumnLabel;
  const preferred = new Map<string, string>();
  [...initial.map((row) => row.column), ...columns].forEach((column) => {
    if (!preferred.has(label(column))) preferred.set(label(column), column);
  });
  const choices = [...preferred.values()];
  const nextColumn = choices.find((column) => !rows.some((row) => label(row.column) === label(column)));
  const change = (index: number, patch: Partial<DatasetInput>) =>
    setRows(rows.map((row, i) => i === index ? { ...row, ...patch } : row));
  const moveUp = (index: number) => {
    const reordered = [...rows];
    [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
    setRows(reordered);
  };
  const valid = new Set(rows.map((row) => row.column)).size === rows.length && rows.every((row) =>
    columns.includes(row.column.split(/--?>/, 1)[0].trim()) &&
    (row.truncate === null || (Number.isInteger(row.truncate) && row.truncate > 0)));
  const changed = JSON.stringify(rows) !== JSON.stringify(initial);
  return (
    <>
      {rows.map((row, index) => (
        <div key={index} className="mt-2 flex items-center gap-1">
          <select className="field-input min-w-0 flex-1" aria-label={tr("messages.47466b81c11a", { p0: index + 1 })}
            value={row.column} onChange={(event) => change(index, { column: event.target.value })}>
            {choices.map((column) => <option key={column} value={column}>{label(column)}</option>)}
          </select>
          <input type="number" min={1} step={1} className="field-input max-w-[58px]" placeholder={tr("ui.full_10b28a")}
            aria-label={tr("messages.9afb4a0b161e", { p0: index + 1 })}
            value={row.truncate ?? ''} onChange={(event) => change(index, {
              truncate: event.target.value === '' ? null : event.target.valueAsNumber,
            })} />
          <button className="tool-btn !px-1" disabled={index === 0}
            aria-label={tr("messages.c0d0b18cf151", { p0: index + 1 })} onClick={() => moveUp(index)}>↑</button>
          <button className="tool-btn !px-1" disabled={rows.length === 1}
            aria-label={tr("messages.6fd5e0520075", { p0: index + 1 })} onClick={() => setRows(rows.filter((_, i) => i !== index))}>×</button>
        </div>
      ))}
      {!valid && <p className="mt-1 text-[10px] text-red-600">{tr("ui.choose_distinct_available_columns_and_positive_trunc_f1ebfd")}</p>}
      <div className="mt-2 flex flex-wrap gap-1">
        <button className="tool-btn outline !h-6 !text-[10px]" disabled={!nextColumn || rows.length >= 64}
          onClick={() => { if (nextColumn) setRows([...rows, { column: nextColumn, truncate: null }]); }}> {tr("ui.add_column_e77ea6")} </button>
        <button className="tool-btn outline !h-6 !text-[10px]" disabled={!changed || !valid} onClick={() => onSave(rows)}> {tr("ui.save_inputs_34d829")} </button>
        {custom && <button className="tool-btn !h-6 !text-[10px]" onClick={() => onSave(null)}>{tr("ui.use_dataset_defaults_d8a8ad")}</button>}
      </div>
    </>
  );
}
