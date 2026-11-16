import { text, tr, useLocale } from '@/i18n';
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
  useLocale();
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
      <section aria-label={tr("ui.experiment_configuration_086b92")} className="min-h-0 overflow-y-auto p-3">
        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">{tr("ui.experiment_configuration_086b92")}</h3>
        <div className="mb-2 space-y-1">
          <Row label={tr("ui.model_name_78a99e")} value={String(cfg.model_name || graph.template_id || 'Custom Model')} />
          <Row label={tr("ui.dataset_105268")} value={graph.nodes.find((n) => n.component.startsWith('dataset.'))?.component || 'dataset.mind'} />
        </div>
        <TrainingSettings />
        <button className="tool-btn outline mt-1.5 w-full justify-center !text-[10px]" disabled={!run}
          onClick={() => void cancelRun()}><Square size={11} /> {tr("ui.cancel_run_83dc24")}</button>
      </section>

      <div className="flex min-h-0 flex-col">
        <div className="flex items-center justify-between border-b border-line px-3 py-1.5">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
            <Terminal size={12} /> {tr("ui.live_training_log_119fc4")} <span className={`status-dot ${text(status)}`} />
            <span className="font-mono text-[9px]">{run?.run_id || tr("ui.no_run_53b829")}</span>
          </span>
          {run && <span className="badge">{text(status)}</span>}
        </div>
        <div className="code-view min-h-0 flex-1 overflow-y-auto bg-[#0f1620] px-3 py-2 text-[#c8d4e3]">
          {logs.map((line, index) => <div key={index}>{line}</div>)}
          {!logs.length && (
            <div className="text-[#71839a]">
              <p>{tr("ui._no_training_process_has_been_started__8a06a1")}</p>
              <p>{tr("ui.click_start_train_to_prepare_missing_resources_then__5a40a5")}</p>
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
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted">{tr("ui.environment_d443a1")}</h3>
          <button className="tool-btn !h-6 !px-1.5" onClick={() => void refreshEnvironment()}><RefreshCw size={11} /></button>
        </div>
        {!environment && <p className="text-[10px] text-muted">{tr("ui.environment_not_loaded__99a80d")}</p>}
        {environment && (
          <div className="space-y-2 text-[10px]">
            <div className="rounded-md border border-line p-2">
              <p className="flex items-center gap-1.5 font-semibold"><Cpu size={11} /> Python {environment.python}</p>
              <p className="mt-1 text-muted">torch {environment.torch}</p>
              <p className="text-muted">{environment.cuda_available
                ? tr("messages.c946080fafe3", { p0: environment.cuda_device_count, p1: environment.device_name })
                : tr("ui.cuda_unavailable_cpu_runs_are_supported_cuda_1__efce5e")}</p>
            </div>
            <div className="rounded-md border border-line p-2">
              <p className="flex items-center gap-1.5 font-semibold"><HardDrive size={11} /> {tr("ui.datasets_embeddings_a8631c")}</p>
              <p className="mt-1 text-muted">{tr("ui.data_directory__c5a700")} {environment.data_root_exists ? 'present' : 'MISSING'}</p>
              <p className="text-muted">{environment.embeddings.filter((e) => e.present).length}/{environment.embeddings.length} {tr("ui.embedding_files_present_99e12f")}</p>
            </div>
            <div className="rounded-md border border-line p-2">
              <p className="flex items-center gap-1.5 font-semibold"><Server size={11} /> {tr("ui.dependencies_0562f3")}</p>
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
          <section aria-label={tr("ui.resolved_token_resources_b71569")} className="mt-3 rounded-md border border-line p-2">
            <h4 className="mb-1 text-[10px] font-semibold">{tr("ui.resolved_token_resources_b71569")}</h4>
            <Row label={tr("ui.source_6da13a")} value={run.config.token_resources.owner === 'dataset' ? 'Dataset' : 'Item Encoder'} />
            <Row label={tr("ui.tokenizer_0c8bdf")} value={`${run.config.token_resources.tokenizer_id}@${run.config.token_resources.tokenizer_revision}`} />
            <Row label={tr("ui.token_embeddings_7c1859")} value={`${run.config.token_resources.model_id}@${run.config.token_resources.revision}`} />
            <Row label={tr("ui.embedding_width_7e39b0")} value={String(run.config.token_resources.embedding_width)} />
          </section>
        )}
        {run && run.blockers.length > 0 && (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-[10px] text-red-700 dark:bg-red-950/30 dark:text-red-300">
            <p className="mb-1 flex items-center gap-1 font-semibold"><Ban size={11} /> {tr("ui.training_blocked_1dd766")}</p>
            {run.blockers.map((blocker, index) => <p key={index} className="mt-1 leading-snug">· {blocker}</p>)}
          </div>
        )}
        {run && run.status === 'completed' && (
          <div className="mt-3 flex items-start gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-[10px] text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
            <CheckCircle2 size={12} className="mt-0.5 shrink-0" /> {tr("ui.run_completed_with_exit_code_b8a6be")} {run.exit_code}{tr("ui._metrics_are_shown_in_the_evaluation_tab__8292b1")} </div>
        )}
        {run?.command?.length ? (
          <div className="mt-3">
            <p className="mb-1 text-[9.5px] font-semibold uppercase tracking-wider text-muted">{tr("ui.executed_command_f989dc")}</p>
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
  useLocale();
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] text-muted">{label}</span>
      <span className="truncate font-mono text-[10px] font-medium" title={value}>{value}</span>
    </div>
  );
}
