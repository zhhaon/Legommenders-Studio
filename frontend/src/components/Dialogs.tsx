import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, GitBranch, Info, Plus, Search, X } from 'lucide-react';
import { api } from '@/api/client';
import { useStudio } from '@/store/graphStore';
import type { CompatibleEntry } from '@/types/api';
import type { ComponentSpec } from '@/types/catalog';
import { CATEGORY_COLORS, iconFor } from '@/utils/ui';

export function Dialogs() {
  const dialog = useStudio((s) => s.dialog);
  const setDialog = useStudio((s) => s.setDialog);
  if (!dialog) return null;
  return (
    <div className="modal-backdrop fixed inset-0 z-50 grid place-items-center p-6" onClick={() => setDialog(null)}>
      <div onClick={(event) => event.stopPropagation()}>
        {dialog === 'reset' && <ResetDialog />}
        {dialog === 'replace' && <ReplaceDialog />}
        {dialog === 'compatible' && <CompatibleDialog />}
      </div>
    </div>
  );
}

function DialogShell({ title, subtitle, onClose, children, width = 'w-[620px]' }: {
  title: string; subtitle: string; onClose: () => void; children: React.ReactNode; width?: string;
}) {
  return (
    <div className={`${width} max-h-[82vh] overflow-hidden rounded-xl border border-line bg-surface shadow-2xl`}>
      <div className="flex items-start justify-between border-b border-line px-4 py-3">
        <div>
          <h3 className="text-[13px] font-bold">{title}</h3>
          <p className="mt-0.5 text-[10px] text-muted">{subtitle}</p>
        </div>
        <button className="tool-btn !h-7 !px-2" onClick={onClose}><X size={14} /></button>
      </div>
      <div className="max-h-[68vh] overflow-y-auto p-4">{children}</div>
    </div>
  );
}

function ResetDialog() {
  const setDialog = useStudio((s) => s.setDialog);
  const resetGraph = useStudio((s) => s.resetGraph);
  const nodeCount = useStudio((s) => s.graph.nodes.length);
  return (
    <DialogShell title="Reset canvas?" subtitle="This removes the current model graph from the canvas." width="w-[420px]" onClose={() => setDialog(null)}>
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
        <AlertTriangle size={15} className="mt-0.5 shrink-0" />
        <span>All {nodeCount} nodes and their connections will be removed. Saved projects and generated YAML files are not deleted. You can Undo this action.</span>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button className="tool-btn outline" onClick={() => setDialog(null)}>Cancel</button>
        <button className="tool-btn !bg-red-600 !text-white hover:!bg-red-700" onClick={resetGraph}>Reset canvas</button>
      </div>
    </DialogShell>
  );
}

function ReplaceDialog() {
  const setDialog = useStudio((s) => s.setDialog);
  const nodeId = useStudio((s) => s.selectedNodeId);
  const graph = useStudio((s) => s.graph);
  const components = useStudio((s) => s.components);
  const replaceComponent = useStudio((s) => s.replaceComponent);
  const toast = useStudio((s) => s.toast);
  const [query, setQuery] = useState('');
  const node = graph.nodes.find((n) => n.id === nodeId);
  const current = node ? components[node.component] : undefined;

  const candidates = useMemo(() => {
    if (!current) return [];
    return Object.values(components).filter((candidate) =>
      candidate.role === current.role && candidate.id !== current.id && candidate.executable,
    ).filter((candidate) => `${candidate.name} ${candidate.id}`.toLowerCase().includes(query.toLowerCase()));
  }, [components, current, query]);

  const migratedPreview = (candidate: ComponentSpec) => {
    if (!node || !current) return { migrated: [] as string[], dropped: [] as string[] };
    const names = new Set(candidate.parameters.map((p) => p.name));
    const currentNames = new Set(current.parameters.map((p) => p.name));
    return {
      migrated: Object.keys(node.params).filter((name) => names.has(name)),
      dropped: Object.keys(node.params).filter((name) => !names.has(name) && currentNames.has(name)),
    };
  };

  if (!node || !current) {
    return (
      <DialogShell title="Replace Component" subtitle="Select a node first." onClose={() => setDialog(null)} width="w-[420px]">
        <p className="text-[11px] text-muted">Select the node you want to replace on the canvas.</p>
      </DialogShell>
    );
  }

  return (
    <DialogShell
      title={`Replace ${current.name}`}
      subtitle={`Choose another ${current.role.replace(/_/g, ' ')}. Studio keeps compatible connections and adjusts related settings where possible.`}
      onClose={() => setDialog(null)}
    >
      <div className="relative mb-3">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
        <input className="field-input !pl-8" placeholder="Search compatible components…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="mb-2 rounded-md border border-line bg-[var(--hover)] px-3 py-2 text-[10px] text-muted">
        <b>Current:</b> {current.name} · {current.inputs.length} inputs / {current.outputs.length} outputs · {current.parameters.length} parameters
      </div>
      <div className="space-y-1.5">
        {candidates.map((candidate) => {
          const Icon = iconFor(candidate.icon);
          const { migrated, dropped } = migratedPreview(candidate);
          const taskOk = candidate.tasks.includes(graph.task);
          const portOk = candidate.inputs.every((port) => current.inputs.some((p) => p.name === port.name && p.type === port.type))
            && candidate.outputs.every((port) => current.outputs.some((p) => p.name === port.name && p.type === port.type));
          return (
            <div key={candidate.id} className="flex items-start gap-3 rounded-lg border border-line p-2.5 hover:bg-[var(--hover)]">
              <div className="icon-tile" style={{ background: CATEGORY_COLORS[candidate.category] }}><Icon size={14} /></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11.5px] font-bold">{candidate.name}</span>
                  <span className={`badge ${portOk ? 'text-emerald-600' : 'text-amber-600'}`}>{portOk ? 'ports compatible' : 'ports differ'}</span>
                  <span className={`badge ${taskOk ? 'text-emerald-600' : 'text-red-600'}`}>{taskOk ? graph.task : `${candidate.tasks.join('/')} only`}</span>
                  {candidate.status === 'available' && <span className="badge">auto-discovered</span>}
                </div>
                <p className="mt-1 text-[10px] leading-snug text-muted">{candidate.description}</p>
                <p className="mt-1 font-mono text-[9px] text-muted">{candidate.meta_value ? `meta: ${candidate.meta_value}` : candidate.id}</p>
                <p className="mt-1 text-[9.5px] text-muted">
                  <Check size={9} className="mr-1 inline text-emerald-600" />{migrated.length} parameter(s) migrated
                  {dropped.length > 0 && <span className="ml-2 text-amber-600">{dropped.length} not supported: {dropped.join(', ')}</span>}
                </p>
              </div>
              <button
                className="tool-btn primary !h-7 !text-[10px]"
                disabled={!taskOk}
                onClick={() => {
                  const result = replaceComponent(node.id, candidate.id);
                  if (!result.ok) toast('error', 'Replacement failed', result.reason);
                  else if (result.dropped.length) toast('warning', 'Parameters not migrated', result.dropped.join(', '));
                }}
              >Replace</button>
            </div>
          );
        })}
        {!candidates.length && <p className="py-6 text-center text-[11px] text-muted">No compatible components found.</p>}
      </div>
      <div className="mt-3 flex items-start gap-1.5 rounded-md border border-line bg-[var(--hover)] p-2 text-[9.5px] text-muted">
        <Info size={11} className="mt-0.5 shrink-0" />
        Replacing a module re-runs graph validation and updates the compiled configuration. Unrecognised combinations are labelled <b>Custom Model</b>.
      </div>
    </DialogShell>
  );
}

function CompatibleDialog() {
  const setDialog = useStudio((s) => s.setDialog);
  const nodeId = useStudio((s) => s.selectedNodeId);
  const graph = useStudio((s) => s.graph);
  const components = useStudio((s) => s.components);
  const addCompatibleComponent = useStudio((s) => s.addCompatibleComponent);
  const [results, setResults] = useState<CompatibleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [direction, setDirection] = useState<'downstream' | 'upstream'>('downstream');
  const node = graph.nodes.find((n) => n.id === nodeId);
  const current = node ? components[node.component] : undefined;

  useEffect(() => {
    if (!current) return;
    let active = true;
    setLoading(true);
    void api.compatible(current.id, direction).then((response) => {
      if (active) { setResults(response.results); setLoading(false); }
    }).catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [current?.id, direction]);

  return (
    <DialogShell
      title="Add Compatible Component"
      subtitle={current ? `Components whose ports can connect to ${current.name}, computed by the backend registry.` : 'Select a node first.'}
      onClose={() => setDialog(null)}
    >
      <div className="mb-3 flex gap-1 rounded-lg border border-line p-1">
        {(['downstream', 'upstream'] as const).map((item) => (
          <button key={item} className={`flex-1 rounded-md py-1 text-[10.5px] font-semibold capitalize ${direction === item ? 'bg-blue-600 text-white' : 'text-muted hover:bg-[var(--hover)]'}`}
            onClick={() => setDirection(item)}>{item}</button>
        ))}
      </div>
      {loading && <p className="py-6 text-center text-[11px] text-muted">Computing compatible ports…</p>}
      <div className="space-y-1.5">
        {results.filter((entry) => components[entry.id]).slice(0, 40).map((entry) => {
          const spec = components[entry.id];
          const Icon = iconFor(spec.icon);
          return (
            <button key={entry.id} className="flex w-full items-start gap-3 rounded-lg border border-line p-2.5 text-left hover:bg-[var(--hover)]"
              onClick={() => addCompatibleComponent(entry.id)}>
              <div className="icon-tile" style={{ background: CATEGORY_COLORS[spec.category] }}><Icon size={14} /></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11.5px] font-bold">{entry.name}</span>
                  <span className="badge">{spec.category.replace(/_/g, ' ')}</span>
                  {entry.conceptual && <span className="badge text-amber-600">conceptual</span>}
                </div>
                <p className="mt-1 text-[10px] text-muted">{entry.description}</p>
                <div className="mt-1 space-y-0.5">
                  {entry.reasons.map((reason) => <p key={reason} className="font-mono text-[9px] text-emerald-600">✓ {reason}</p>)}
                </div>
              </div>
              <Plus size={14} className="mt-1 shrink-0 text-muted" />
            </button>
          );
        })}
        {!loading && !results.length && <p className="py-6 text-center text-[11px] text-muted">No compatible components in this direction.</p>}
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-[9.5px] text-muted"><GitBranch size={11} /> The new node is placed near the selected one and connected to the first compatible port.</div>
    </DialogShell>
  );
}
