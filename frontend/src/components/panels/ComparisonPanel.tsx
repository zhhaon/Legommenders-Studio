import { useMemo, useState } from 'react';
import { Columns3, FlaskConical } from 'lucide-react';
import { useStudio } from '@/store/graphStore';

export function ComparisonPanel() {
  const runs = useStudio((s) => s.runs);
  const openRun = useStudio((s) => s.openRun);
  const completed = useMemo(() => runs.filter((r) => r.status === 'completed'), [runs]);
  const [selected, setSelected] = useState<string[]>([]);

  const chosen = completed.filter((run) => selected.includes(run.run_id));
  const metricNames = useMemo(() => {
    const names = new Set<string>();
    for (const run of chosen) Object.keys(run.metrics).forEach((name) => names.add(name));
    return [...names].sort();
  }, [chosen]);

  const toggle = (id: string) => setSelected((previous) =>
    previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id].slice(-6));

  return (
    <div className="h-full overflow-y-auto p-3">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-1.5 text-[11px] font-bold"><Columns3 size={13} /> Model Comparison</h3>
          <p className="mt-0.5 text-[9.5px] text-muted">Only completed real runs can be compared. No placeholder metrics.</p>
        </div>
        <span className="badge">{completed.length} completed run(s)</span>
      </div>

      {!completed.length ? (
        <div className="rounded-lg border border-dashed border-line bg-[var(--hover)] p-6 text-center">
          <FlaskConical size={26} className="mx-auto mb-2 text-muted/50" />
          <p className="text-[12px] font-semibold">No completed experiments</p>
          <p className="mt-1 text-[10px] text-muted">Finish at least two real training runs to compare their metrics and configurations.</p>
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {completed.map((run) => (
              <button key={run.run_id}
                className={`tool-btn !h-7 !text-[10px] ${selected.includes(run.run_id) ? 'primary' : 'outline'}`}
                onClick={() => toggle(run.run_id)}>
                {run.model_label} · {run.run_id.slice(0, 6)} · {Object.keys(run.metrics).length} metrics
              </button>
            ))}
          </div>
          {!chosen.length ? (
            <p className="text-[10.5px] text-muted">Select completed runs above to build a comparison table.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-line">
              <table className="w-full min-w-[600px] text-[10.5px]">
                <thead className="bg-[var(--hover)] text-muted">
                  <tr>
                    <th className="px-3 py-2 text-left">Field</th>
                    {chosen.map((run) => <th key={run.run_id} className="px-3 py-2 text-left">{run.model_label}<span className="ml-1 font-mono text-[9px]">#{run.run_id.slice(0, 6)}</span></th>)}
                  </tr>
                </thead>
                <tbody>
                  <CompareRow label="Status" values={chosen.map((r) => r.status)} />
                  <CompareRow label="Task" values={chosen.map((r) => r.task)} />
                  <CompareRow label="Dataset" values={chosen.map((r) => r.dataset)} />
                  <CompareRow label="Batch size" values={chosen.map((r) => String(r.params.batch_size ?? '—'))} />
                  <CompareRow label="Learning rate" values={chosen.map((r) => String(r.params.lr ?? '—'))} />
                  <CompareRow label="Hidden size" values={chosen.map((r) => String(r.params.hidden_size ?? '—'))} />
                  <CompareRow label="Epochs" values={chosen.map((r) => String(r.params.epochs ?? '—'))} />
                  <CompareRow label="Device" values={chosen.map((r) => String(r.params.device ?? '—'))} />
                  {metricNames.map((name) => (
                    <CompareRow key={name} label={name} highlight values={chosen.map((r) => r.metrics[name] !== undefined ? r.metrics[name].toFixed(4) : '—')} />
                  ))}
                  <CompareRow label="Structure" values={chosen.map((r) => (r.graph?.nodes || []).map((n) => n.component).join(' + '))} />
                  <tr>
                    <td className="border-t border-line px-3 py-2 text-muted">Logs</td>
                    {chosen.map((run) => (
                      <td key={run.run_id} className="border-t border-line px-3 py-2">
                        <button className="tool-btn outline !h-6 !text-[9.5px]" onClick={() => void openRun(run.run_id)}>Open run</button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CompareRow({ label, values, highlight }: { label: string; values: string[]; highlight?: boolean }) {
  return (
    <tr className="border-t border-line">
      <td className={`px-3 py-1.5 ${highlight ? 'font-semibold' : 'text-muted'}`}>{label}</td>
      {values.map((value, index) => (
        <td key={index} className={`max-w-[240px] truncate px-3 py-1.5 font-mono ${highlight ? 'font-bold text-blue-600' : ''}`} title={value}>{value}</td>
      ))}
    </tr>
  );
}
