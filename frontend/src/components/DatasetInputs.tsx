import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { useStudio } from '@/store/graphStore';
import type { DatasetInput, GraphNode } from '@/types/graph';

export function DatasetInputs({ node }: { node: GraphNode }) {
  const itemComponent = useStudio((s) => s.graph.nodes.find((n) => n.component.startsWith('item.'))?.component);
  const updateParam = useStudio((s) => s.updateParam);
  const { data_config, embed_config, lm, lang, token_source, item_inputs } = node.params;
  const request = JSON.stringify({
    nodes: [
      { id: node.id, component: node.component, params: { data_config, embed_config, lm, lang, token_source } },
      ...(itemComponent ? [{ id: 'preview_encoder', component: itemComponent }] : []),
    ],
  });
  const [preview, setPreview] = useState<{ request: string; defaults: DatasetInput[]; columns: string[] }>();
  const [error, setError] = useState<{ request: string; message: string }>();
  useEffect(() => {
    let active = true;
    void api.datasetInputs(JSON.parse(request)).then(
      (result) => { if (active) { setError(undefined); setPreview({ request, ...result }); } },
      (reason: Error) => { if (active) setError({ request, message: reason.message }); },
    );
    return () => { active = false; };
  }, [request]);

  return (
    <section aria-label="Dataset item inputs" className="rounded-lg border border-line p-2">
      <h4 className="field-label">Dataset item inputs</h4>
      <p className="field-help">Sample columns for canvas configuration only; no dataset or tokenizer is loaded. Choose attributes and lengths, or leave length blank.</p>
      {error?.request === request ? <p role="alert" className="text-[10px] text-red-600">{error.message}</p>
        : preview?.request === request ? (
          <InputRows
            key={request + JSON.stringify(item_inputs)}
            initial={((item_inputs as DatasetInput[] | null | undefined) ?? preview.defaults).map((row) => {
              const base = row.column.split('@')[0];
              const column = preview.defaults.find((entry) => entry.column.split('@')[0] === base)?.column
                ?? preview.columns.find((entry) => entry.split('@')[0] === base) ?? row.column;
              return { ...row, column };
            })}
            columns={preview.columns}
            custom={item_inputs != null}
            onSave={(inputs) => updateParam(node.id, 'item_inputs', inputs)}
          />
        ) : <p className="field-help">Loading item inputs…</p>}
    </section>
  );
}

function InputRows({ initial, columns, custom, onSave }: {
  initial: DatasetInput[];
  columns: string[];
  custom: boolean;
  onSave: (inputs: DatasetInput[] | null) => void;
}) {
  const [rows, setRows] = useState(initial);
  const label = (column: string) => column.replace(/@[^ ]+/g, '');
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
          <select className="field-input min-w-0 flex-1" aria-label={`Item column ${index + 1}`}
            value={row.column} onChange={(event) => change(index, { column: event.target.value })}>
            {choices.map((column) => <option key={column} value={column}>{label(column)}</option>)}
          </select>
          <input type="number" min={1} step={1} className="field-input max-w-[58px]" placeholder="Full"
            aria-label={`Truncation for item column ${index + 1}`}
            value={row.truncate ?? ''} onChange={(event) => change(index, {
              truncate: event.target.value === '' ? null : event.target.valueAsNumber,
            })} />
          <button className="tool-btn !px-1" disabled={index === 0}
            aria-label={`Move item column ${index + 1} up`} onClick={() => moveUp(index)}>↑</button>
          <button className="tool-btn !px-1" disabled={rows.length === 1}
            aria-label={`Remove item column ${index + 1}`} onClick={() => setRows(rows.filter((_, i) => i !== index))}>×</button>
        </div>
      ))}
      {!valid && <p className="mt-1 text-[10px] text-red-600">Choose distinct available columns and positive truncation lengths.</p>}
      <div className="mt-2 flex flex-wrap gap-1">
        <button className="tool-btn outline !h-6 !text-[10px]" disabled={!nextColumn || rows.length >= 64}
          onClick={() => { if (nextColumn) setRows([...rows, { column: nextColumn, truncate: null }]); }}>
          Add column
        </button>
        <button className="tool-btn outline !h-6 !text-[10px]" disabled={!changed || !valid} onClick={() => onSave(rows)}>
          Save inputs
        </button>
        {custom && <button className="tool-btn !h-6 !text-[10px]" onClick={() => onSave(null)}>Use dataset defaults</button>}
      </div>
    </>
  );
}
