import { text, tr, useLocale } from '@/i18n';
import { issueText } from '@/i18n/display';
import { useEffect, useRef } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Terminal, Trash2 } from 'lucide-react';
import { useStudio } from '@/store/graphStore';

export function ConsolePanel() {
  useLocale();
  const lines = useStudio((s) => s.consoleLines);
  const validation = useStudio((s) => s.validation);
  const clearConsole = useStudio((s) => s.clearConsole);
  const focusNode = useStudio((s) => s.focusNode);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [lines.length]);

  const issues = [
    ...(validation?.errors || []),
    ...(validation?.warnings || []),
    ...(validation?.runtime_checks || []),
  ];

  return (
    <div className="grid h-full grid-cols-[minmax(0,1fr)_340px] divide-x divide-line">
      <div className="flex min-h-0 flex-col">
        <div className="flex items-center justify-between border-b border-line px-3 py-1.5">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
            <Terminal size={12} /> {tr("ui.console__32ce51")} {lines.length} {tr("ui.lines_8525aa")} </span>
          <button className="tool-btn !h-6 !px-1.5 !text-[9.5px]" onClick={clearConsole}><Trash2 size={11} /> {tr("ui.clear_719ea3")}</button>
        </div>
        <div className="code-view min-h-0 flex-1 overflow-y-auto px-3 py-2 text-muted">
          {lines.map((line, index) => (
            <div key={index} className={line.includes('ERROR') ? 'text-red-600' : line.includes('VALIDATION OK') || line.includes('COMPILE OK') ? 'text-emerald-600' : ''}>
              {text(line)}
            </div>
          ))}
          {!lines.length && <p className="italic opacity-60">{tr("ui.no_console_output_yet__c22518")}</p>}
          <div ref={endRef} />
        </div>
      </div>

      <div className="flex min-h-0 flex-col">
        <div className="border-b border-line px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted"> {tr("ui.validation_report_943fd5")} {validation && (validation.valid
            ? <span className="ml-1 text-emerald-600">{tr("ui._model_graph_is_valid_672970")}</span>
            : <span className="ml-1 text-red-600">· {validation.errors.length} {tr("ui.error_s__1f77a3")}</span>)}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
          {!validation && <p className="text-[10.5px] text-muted">{tr("ui.click_79cbc5")} <b>{tr("ui.validate_6752f1")}</b> {tr("ui.to_run_the_backend_graph_validator__988243")}</p>}
          {validation?.valid && (
            <div className="mb-2 flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-[10.5px] text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
              <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
              <span>{tr("ui.model_graph_is_valid__09a1c9")} {validation.summary.model_label} · {validation.summary.nodes} {tr("ui.nodes__6cf762")} {validation.summary.edges} {tr("ui.edges__e40176")}</span>
            </div>
          )}
          {issues.map((issue, index) => {
            const Icon = issue.severity === 'error' ? AlertCircle : issue.severity === 'warning' ? AlertTriangle : Info;
            const color = issue.severity === 'error' ? 'text-red-600 border-red-200 bg-red-50 dark:bg-red-950/30'
              : issue.severity === 'warning' ? 'text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950/30'
                : 'text-blue-700 border-blue-200 bg-blue-50 dark:bg-blue-950/30';
            return (
              <button
                key={`${issue.code}-${index}`}
                className={`mb-1.5 w-full rounded-md border p-2 text-left text-[10px] leading-snug ${color}`}
                onClick={() => issue.node_id && focusNode(issue.node_id)}
                title={issue.node_id ? tr("ui.click_to_locate_the_node_on_the_canvas_149de2") : undefined}
              >
                <span className="flex items-start gap-1.5">
                  <Icon size={12} className="mt-0.5 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <b className="uppercase tracking-wide">{issue.code.replace(/_/g, ' ')}</b> · {issueText(issue, 'message')}
                    {issue.reason && <span className="mt-1 block opacity-80">{tr("ui.why__01bb3c")} {issueText(issue, 'reason')}</span>}
                    {issue.fix && <span className="mt-0.5 block opacity-80">{tr("ui.fix__c341e9")} {issueText(issue, 'fix')}</span>}
                    {issue.node_id && <span className="mt-0.5 block font-mono text-[9px] opacity-70">{tr("ui.node__37c06c")} {issue.node_id} ↗</span>}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
