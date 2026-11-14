import { useEffect, useRef } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Terminal, Trash2 } from 'lucide-react';
import { useStudio } from '@/store/graphStore';

export function ConsolePanel() {
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
            <Terminal size={12} /> Console · {lines.length} lines
          </span>
          <button className="tool-btn !h-6 !px-1.5 !text-[9.5px]" onClick={clearConsole}><Trash2 size={11} /> Clear</button>
        </div>
        <div className="code-view min-h-0 flex-1 overflow-y-auto px-3 py-2 text-muted">
          {lines.map((line, index) => (
            <div key={index} className={line.includes('ERROR') ? 'text-red-600' : line.includes('VALIDATION OK') || line.includes('COMPILE OK') ? 'text-emerald-600' : ''}>
              {line}
            </div>
          ))}
          {!lines.length && <p className="italic opacity-60">No console output yet.</p>}
          <div ref={endRef} />
        </div>
      </div>

      <div className="flex min-h-0 flex-col">
        <div className="border-b border-line px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
          Validation report {validation && (validation.valid
            ? <span className="ml-1 text-emerald-600">· Model Graph is Valid</span>
            : <span className="ml-1 text-red-600">· {validation.errors.length} error(s)</span>)}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
          {!validation && <p className="text-[10.5px] text-muted">Click <b>Validate</b> to run the backend graph validator.</p>}
          {validation?.valid && (
            <div className="mb-2 flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-[10.5px] text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
              <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
              <span>Model Graph is Valid. {validation.summary.model_label} · {validation.summary.nodes} nodes / {validation.summary.edges} edges.</span>
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
                title={issue.node_id ? 'Click to locate the node on the canvas' : undefined}
              >
                <span className="flex items-start gap-1.5">
                  <Icon size={12} className="mt-0.5 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <b className="uppercase tracking-wide">{issue.code.replace(/_/g, ' ')}</b> · {issue.message}
                    {issue.reason && <span className="mt-1 block opacity-80">Why: {issue.reason}</span>}
                    {issue.fix && <span className="mt-0.5 block opacity-80">Fix: {issue.fix}</span>}
                    {issue.node_id && <span className="mt-0.5 block font-mono text-[9px] opacity-70">node: {issue.node_id} ↗</span>}
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
