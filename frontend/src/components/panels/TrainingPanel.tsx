import { mergeLogRows } from '@/utils/progressLog';
import { TrainingSettings } from '@/components/TrainingSettings';
import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, Ban, CheckCircle2, Cpu, HardDrive, RefreshCw, Server, Square, Terminal,
} from 'lucide-react';
import { api } from '@/api/client';
import { useStudio } from '@/store/graphStore';
import type { RunStatus } from '@/types/api';

export function TrainingPanel() {
  const graph = useStudio((s) => s.graph);
  const environment = useStudio((s) => s.environment);
  const run = useStudio((s) => s.currentRun);
  const cancelRun = useStudio((s) => s.cancelRun);
  const refreshEnvironment = useStudio((s) => s.refreshEnvironment);
  const [logs, setLogs] = useState<string[]>([]);
  const cursor = useRef(0);
  const logEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!run) { setLogs([]); cursor.current = 0; return; }
    setLogs(run.log_lines || []);
    cursor.current = (run.log_offset ?? 0) + (run.log_lines || []).length;
  }, [run?.run_id]);

  useEffect(() => {
    if (!run || !run.command.length) return;
    let active = true;
    const tick = async () => {
      try {
        const response = await api.runLogs(run.run_id, cursor.current);
        if (!active) return;
        const previousCursor = cursor.current;
        cursor.current = response.next;
        setLogs((previous) => mergeLogRows(previous, previousCursor, response));
      } catch { /* backend temporarily unavailable */ }
    };
    void tick();
    const timer = run.status === 'running' || run.status === 'pending'
      ? window.setInterval(() => void tick(), 900) : undefined;
    return () => { active = false; window.clearInterval(timer); };
  }, [run?.run_id, run?.status]);

  useEffect(() => { logEnd.current?.scrollIntoView({ block: 'end' }); }, [logs.length]);

  const status: RunStatus = run?.status || 'pending';
  const cfg = run?.config || {};

  return (
    <div className="grid h-full grid-cols-[290px_minmax(0,1fr)_300px] divide-x divide-line">
      <section aria-label="Experiment configuration" className="min-h-0 overflow-y-auto p-3">
        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">Experiment configuration</h3>
        <div className="mb-2 space-y-1">
          <Row label="Model Name" value={String(cfg.model_name || graph.template_id || 'Custom Model')} />
          <Row label="Dataset" value={graph.nodes.find((n) => n.component.startsWith('dataset.'))?.component || 'dataset.mind'} />
        </div>
        <TrainingSettings />
        <button className="tool-btn outline mt-1.5 w-full justify-center !text-[10px]" disabled={!run}
          onClick={() => void cancelRun()}><Square size={11} /> Cancel run</button>
      </section>

      <div className="flex min-h-0 flex-col">
        <div className="flex items-center justify-between border-b border-line px-3 py-1.5">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
            <Terminal size={12} /> Live training log
            <span className={`status-dot ${status}`} />
            <span className="font-mono text-[9px]">{run?.run_id || 'no run'}</span>
          </span>
          {run && <span className="badge">{status}</span>}
        </div>
        <div className="code-view min-h-0 flex-1 overflow-y-auto bg-[#0f1620] px-3 py-2 text-[#c8d4e3]">
          {logs.map((line, index) => <div key={index}>{line}</div>)}
          {!logs.length && (
            <div className="text-[#71839a]">
              <p>// No training process has been started.</p>
              <p>Click Start Train to prepare missing resources, then run Legommenders.</p>
            </div>
          )}
          <div ref={logEnd} />
        </div>
        {run?.error && (
          <div className="max-h-24 overflow-y-auto border-t border-red-200 bg-red-50 px-3 py-1.5 font-mono text-[9.5px] text-red-700 dark:bg-red-950/30 dark:text-red-300">
            {run.error}
          </div>
        )}
      </div>

      <div className="min-h-0 overflow-y-auto p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted">Environment</h3>
          <button className="tool-btn !h-6 !px-1.5" onClick={() => void refreshEnvironment()}><RefreshCw size={11} /></button>
        </div>
        {!environment && <p className="text-[10px] text-muted">Environment not loaded.</p>}
        {environment && (
          <div className="space-y-2 text-[10px]">
            <div className="rounded-md border border-line p-2">
              <p className="flex items-center gap-1.5 font-semibold"><Cpu size={11} /> Python {environment.python}</p>
              <p className="mt-1 text-muted">torch {environment.torch}</p>
              <p className="text-muted">{environment.cuda_available
                ? `${environment.cuda_device_count} CUDA device(s): ${environment.device_name}`
                : 'CUDA unavailable — CPU runs are supported (--cuda -1).'}</p>
            </div>
            <div className="rounded-md border border-line p-2">
              <p className="flex items-center gap-1.5 font-semibold"><HardDrive size={11} /> Datasets & embeddings</p>
              <p className="mt-1 text-muted">data/ directory: {environment.data_root_exists ? 'present' : 'MISSING'}</p>
              <p className="text-muted">{environment.embeddings.filter((e) => e.present).length}/{environment.embeddings.length} embedding files present</p>
            </div>
            <div className="rounded-md border border-line p-2">
              <p className="flex items-center gap-1.5 font-semibold"><Server size={11} /> Dependencies</p>
              <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px]">
                {Object.entries(environment.dependencies).map(([name, version]) => (
                  <div key={name} className="flex justify-between gap-1">
                    <span className="text-muted">{name}</span>
                    <span className={version.startsWith('MISSING') ? 'text-red-600' : 'text-emerald-600'}>{version.slice(0, 9)}</span>
                  </div>
                ))}
              </div>
            </div>
            {environment.warnings.map((warning, index) => (
              <p key={index} className="flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                <AlertTriangle size={11} className="mt-0.5 shrink-0" /> {warning}
              </p>
            ))}
          </div>
        )}
        {run?.config.token_resources && (
          <section aria-label="Resolved token resources" className="mt-3 rounded-md border border-line p-2">
            <h4 className="mb-1 text-[10px] font-semibold">Resolved token resources</h4>
            <Row label="Source" value={run.config.token_resources.owner === 'dataset' ? 'Dataset' : 'Item Encoder'} />
            <Row label="Tokenizer" value={`${run.config.token_resources.tokenizer_id}@${run.config.token_resources.tokenizer_revision}`} />
            <Row label="Token embeddings" value={`${run.config.token_resources.model_id}@${run.config.token_resources.revision}`} />
            <Row label="Embedding width" value={String(run.config.token_resources.embedding_width)} />
          </section>
        )}
        {run && run.blockers.length > 0 && (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-[10px] text-red-700 dark:bg-red-950/30 dark:text-red-300">
            <p className="mb-1 flex items-center gap-1 font-semibold"><Ban size={11} /> Training blocked</p>
            {run.blockers.map((blocker, index) => <p key={index} className="mt-1 leading-snug">· {blocker}</p>)}
          </div>
        )}
        {run && run.status === 'completed' && (
          <div className="mt-3 flex items-start gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-[10px] text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
            <CheckCircle2 size={12} className="mt-0.5 shrink-0" /> Run completed with exit code {run.exit_code}. Metrics are shown in the Evaluation tab.
          </div>
        )}
        {run?.command?.length ? (
          <div className="mt-3">
            <p className="mb-1 text-[9.5px] font-semibold uppercase tracking-wider text-muted">Executed command</p>
            <pre className="code-view max-h-28 overflow-auto rounded-md border border-line bg-[var(--hover)] p-2 text-[9px] text-muted">
              {run.command.join(' ')}
            </pre>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] text-muted">{label}</span>
      <span className="truncate font-mono text-[10px] font-medium" title={value}>{value}</span>
    </div>
  );
}
