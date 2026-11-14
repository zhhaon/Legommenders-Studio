import { useMemo } from 'react';
import {
  BarChart3, Download, FileCode2, Info, ListTree, SlidersHorizontal, TrendingUp,
} from 'lucide-react';
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { downloadText } from '@/api/client';
import { useStudio } from '@/store/graphStore';

const METRIC_LABELS: Record<string, string> = {
  GAUC: 'GAUC', AUC: 'AUC', MRR: 'MRR', MRR0: 'MRR0',
  'NDCG@1': 'NDCG@1', 'NDCG@5': 'NDCG@5', 'NDCG@10': 'NDCG@10',
  LogLoss: 'LogLoss', LRAP: 'LRAP',
};

export function EvaluationPanel() {
  const run = useStudio((s) => s.currentRun);
  const graph = useStudio((s) => s.graph);
  const components = useStudio((s) => s.components);
  const openRun = useStudio((s) => s.openRun);
  const runs = useStudio((s) => s.runs);
  const completed = runs.filter((r) => r.status === 'completed' && Object.keys(r.metrics).length > 0);

  const lossData = useMemo(() => (run?.loss_curve || []).map((point, index) => ({
    x: point.step ?? index, epoch: point.epoch, loss: point.value,
  })), [run?.loss_curve]);
  const validationData = useMemo(() => {
    const byEpoch: Record<number, Record<string, number | string>> = {};
    for (const point of run?.validation_curve || []) {
      byEpoch[point.epoch] ||= { epoch: point.epoch };
      byEpoch[point.epoch][point.metric] = point.value;
    }
    return Object.values(byEpoch).sort((a, b) => Number(a.epoch) - Number(b.epoch));
  }, [run?.validation_curve]);

  const metrics = Object.entries(run?.metrics || {});
  const hasResults = Boolean(run && run.status === 'completed' && metrics.length);

  return (
    <div className="h-full overflow-y-auto p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-1.5 text-[11px] font-bold"><BarChart3 size={13} /> Evaluation Dashboard</h3>
          <p className="mt-0.5 text-[9.5px] text-muted">Only real metrics emitted by trainer.py / tester.py are displayed. No values are simulated.</p>
        </div>
        <div className="flex items-center gap-1.5">
          <select
            className="field-input !h-7 !w-56 !text-[10px]"
            value={run?.run_id || ''}
            onChange={(event) => void openRun(event.target.value)}
          >
            <option value="">Select a completed run…</option>
            {completed.map((item) => (
              <option key={item.run_id} value={item.run_id}>{item.model_label} · {item.run_id} · {Object.keys(item.metrics).length} metrics</option>
            ))}
          </select>
          <button className="tool-btn outline !h-7 !text-[10px]" disabled={!run?.model_yaml}
            onClick={() => run && downloadText(`${run.model_label || 'model'}.yaml`, run.model_yaml, 'application/yaml')}>
            <FileCode2 size={11} /> Config
          </button>
        </div>
      </div>

      {!hasResults && (
        <div className="mb-3 rounded-lg border border-dashed border-line bg-[var(--hover)] p-5 text-center">
          <TrendingUp size={26} className="mx-auto mb-2 text-muted/50" />
          <p className="text-[12px] font-semibold">No evaluation results yet</p>
          <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
            {run?.blockers?.length
              ? `A real run could not start: ${run.blockers[0]}`
              : 'Train a model (or evaluate a saved checkpoint) to populate GAUC, MRR and NDCG from tester.py.'}
          </p>
        </div>
      )}

      {hasResults && (
        <>
          <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
            {metrics.map(([name, value]) => (
              <div key={name} className="rounded-lg border border-line bg-surface p-2.5 shadow-panel">
                <p className="text-[9.5px] font-semibold uppercase tracking-wide text-muted">{METRIC_LABELS[name] || name}</p>
                <p className="mt-1 font-mono text-[19px] font-bold leading-none" style={{ color: 'var(--accent)' }}>{value.toFixed(4)}</p>
                <p className="mt-1 text-[8.5px] text-muted">test set · real output</p>
              </div>
            ))}
          </div>
          <div className="mb-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
            <ChartCard title="Training Loss" icon={<TrendingUp size={12} />} empty={!lossData.length}>
              <LineChart data={lossData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="x" tick={{ fontSize: 9 }} stroke="var(--text-muted)" />
                <YAxis tick={{ fontSize: 9 }} stroke="var(--text-muted)" />
                <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="loss" stroke="#2563eb" dot={false} strokeWidth={2} />
              </LineChart>
            </ChartCard>
            <ChartCard title="Validation Metrics" icon={<TrendingUp size={12} />} empty={!validationData.length}>
              <LineChart data={validationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="epoch" tick={{ fontSize: 9 }} stroke="var(--text-muted)" />
                <YAxis tick={{ fontSize: 9 }} stroke="var(--text-muted)" />
                <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey={run?.params?.dev_metric as string || 'GAUC'} stroke="#16a34a" dot strokeWidth={2} />
              </LineChart>
            </ChartCard>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
        <div className="rounded-lg border border-line bg-surface p-2.5">
          <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted"><ListTree size={12} /> Test Results</h4>
          {metrics.length ? (
            <table className="w-full text-[10px]">
              <thead><tr className="border-b border-line text-muted"><th className="py-1 text-left">Metric</th><th className="py-1 text-right">Value</th></tr></thead>
              <tbody>
                {metrics.map(([name, value]) => (
                  <tr key={name} className="border-b border-line/60 last:border-0">
                    <td className="py-1">{METRIC_LABELS[name] || name}</td>
                    <td className="py-1 text-right font-mono font-semibold">{value.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-[10px] text-muted">No test results available.</p>}
        </div>

        <div className="rounded-lg border border-line bg-surface p-2.5">
          <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted"><SlidersHorizontal size={12} /> Experiment Parameters</h4>
          <div className="space-y-1 text-[10px]">
            {Object.entries(run?.params || graph.train).slice(0, 10).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-2">
                <span className="text-muted capitalize">{key.replace(/_/g, ' ')}</span>
                <span className="truncate font-mono">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-surface p-2.5">
          <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted"><Info size={12} /> Model Structure</h4>
          <div className="space-y-1 text-[10px]">
            <div className="flex justify-between"><span className="text-muted">Model</span><b>{run?.model_label || graph.name}</b></div>
            <div className="flex justify-between"><span className="text-muted">Task</span><b>{run?.task || graph.task}</b></div>
            <div className="flex justify-between"><span className="text-muted">Dataset</span><b className="font-mono text-[9px]">{String(run?.dataset || '').split('/').pop()}</b></div>
            {(run?.graph || graph).nodes.map((node) => (
              <div key={node.id} className="flex justify-between gap-2">
                <span className="text-muted capitalize">{components[node.component]?.category.replace(/_/g, ' ') || node.type}</span>
                <span className="truncate font-medium">{components[node.component]?.name || node.component}</span>
              </div>
            ))}
          </div>
          {run?.model_yaml && (
            <button className="tool-btn outline mt-2 w-full justify-center !text-[9.5px]"
              onClick={() => downloadText(`${run.model_label || 'model'}.yaml`, run.model_yaml, 'application/yaml')}>
              <Download size={11} /> Download model config
            </button>
          )}
        </div>
      </div>

      {run && (run.log_lines.length > 0) && (
        <div className="mt-2 rounded-lg border border-line bg-surface p-2.5">
          <h4 className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">Experiment log (last 30 lines)</h4>
          <pre className="code-view max-h-32 overflow-y-auto text-[9.5px] text-muted">{run.log_lines.slice(-30).join('\n')}</pre>
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, icon, empty, children }: {
  title: string; icon: React.ReactNode; empty: boolean; children: React.ReactElement;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface p-2.5">
      <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">{icon} {title}</h4>
      {empty ? (
        <div className="grid h-[150px] place-items-center rounded-md border border-dashed border-line text-[10px] text-muted">
          No curve data was emitted by this run.
        </div>
      ) : (
        <div className="h-[150px]"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>
      )}
    </div>
  );
}
