import { text, tr, useLocale } from '@/i18n';
import { componentText, categoryLabel, paramLabel } from '@/i18n/display';
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, GitBranch, Info, Plus, Search, X } from 'lucide-react';
import { api } from '@/api/client';
import { useStudio } from '@/store/graphStore';
import type { CompatibleEntry } from '@/types/api';
import type { ComponentSpec } from '@/types/catalog';
import { CATEGORY_COLORS, iconFor } from '@/utils/ui';

export function Dialogs() {
  useLocale();
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
  useLocale();
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
  useLocale();
  const setDialog = useStudio((s) => s.setDialog);
  const resetGraph = useStudio((s) => s.resetGraph);
  const nodeCount = useStudio((s) => s.graph.nodes.length);
  return (
    <DialogShell title={tr("ui.reset_canvas__906a0f")} subtitle={tr("ui.this_removes_the_current_model_graph_from_the_canvas_2a1dd7")} width="w-[420px]" onClose={() => setDialog(null)}>
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
        <AlertTriangle size={15} className="mt-0.5 shrink-0" />
        <span>{tr("ui.all_6a7208")} {nodeCount} {tr("ui.nodes_and_their_connections_will_be_removed_saved_pr_473a3b")}</span>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button className="tool-btn outline" onClick={() => setDialog(null)}>{tr("ui.cancel_77dfd2")}</button>
        <button className="tool-btn !bg-red-600 !text-white hover:!bg-red-700" onClick={resetGraph}>{tr("ui.reset_canvas_c40c34")}</button>
      </div>
    </DialogShell>
  );
}

function ReplaceDialog() {
  useLocale();
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
    ).filter((candidate) => `${componentText(candidate, 'name')} ${candidate.id}`.toLowerCase().includes(query.toLowerCase()));
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
      <DialogShell title={tr("ui.replace_component_46b0df")} subtitle={tr("ui.select_a_node_first__c21eff")} onClose={() => setDialog(null)} width="w-[420px]">
        <p className="text-[11px] text-muted">{tr("ui.select_the_node_you_want_to_replace_on_the_canvas__28373e")}</p>
      </DialogShell>
    );
  }

  return (
    <DialogShell
      title={tr("messages.9dcf3b66cab7", { p0: componentText(current, 'name') })}
      subtitle={tr("messages.e5d2a22efbff", { p0: current.role.replace(/_/g, ' ') })}
      onClose={() => setDialog(null)}
    >
      <div className="relative mb-3">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
        <input className="field-input !pl-8" placeholder={tr("ui.search_compatible_components__5ec15d")} value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="mb-2 rounded-md border border-line bg-[var(--hover)] px-3 py-2 text-[10px] text-muted">
        <b>{tr("ui.current__19889c")}</b> {componentText(current, 'name')} · {current.inputs.length} {tr("ui.inputs__c07bdc")} {current.outputs.length} {tr("ui.outputs__925d35")} {current.parameters.length} {tr("ui.parameters_f1f142")} </div>
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
                  <span className="text-[11.5px] font-bold">{componentText(candidate, 'name')}</span>
                  <span className={`badge ${portOk ? 'text-emerald-600' : 'text-amber-600'}`}>{portOk ? tr("ui.ports_compatible_fa00a6") : tr("ui.ports_differ_cdae18")}</span>
                  <span className={`badge ${taskOk ? 'text-emerald-600' : 'text-red-600'}`}>{taskOk ? graph.task : `${candidate.tasks.join('/')} only`}</span>
                </div>
                <p className="mt-1 text-[10px] leading-snug text-muted">{componentText(candidate, 'description')}</p>
                <p className="mt-1 font-mono text-[9px] text-muted">{candidate.meta_value ? `meta: ${candidate.meta_value}` : candidate.id}</p>
                <p className="mt-1 text-[9.5px] text-muted">
                  <Check size={9} className="mr-1 inline text-emerald-600" />{migrated.length} {tr("ui.parameter_s_migrated_a1ca3d")} {dropped.length > 0 && <span className="ml-2 text-amber-600">{dropped.length} {tr("ui.not_supported__758cd0")} {dropped.map(paramLabel).join(', ')}</span>}
                </p>
              </div>
              <button
                className="tool-btn primary !h-7 !text-[10px]"
                disabled={!taskOk}
                onClick={() => {
                  const result = replaceComponent(node.id, candidate.id);
                  if (!result.ok) toast('error', 'Replacement failed', result.reason);
                  else if (result.dropped.length) toast('warning', 'Parameters not migrated', result.dropped.map(paramLabel).join(', '));
                }}
              >{tr("ui.replace_a7cf7b")}</button>
            </div>
          );
        })}
        {!candidates.length && <p className="py-6 text-center text-[11px] text-muted">{tr("ui.no_compatible_components_found__e6c505")}</p>}
      </div>
      <div className="mt-3 flex items-start gap-1.5 rounded-md border border-line bg-[var(--hover)] p-2 text-[9.5px] text-muted">
        <Info size={11} className="mt-0.5 shrink-0" /> {tr("ui.replacing_a_module_re_runs_graph_validation_and_upda_f32af0")} <b>Custom Model</b>.
      </div>
    </DialogShell>
  );
}

function CompatibleDialog() {
  useLocale();
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
      title={tr("ui.add_compatible_component_6657ed")}
      subtitle={current ? tr("messages.92c03c90b003", { p0: componentText(current, 'name') }) : tr("ui.select_a_node_first__c21eff")}
      onClose={() => setDialog(null)}
    >
      <div className="mb-3 flex gap-1 rounded-lg border border-line p-1">
        {(['downstream', 'upstream'] as const).map((item) => (
          <button key={item} className={`flex-1 rounded-md py-1 text-[10.5px] font-semibold capitalize ${direction === item ? 'bg-blue-600 text-white' : 'text-muted hover:bg-[var(--hover)]'}`}
            onClick={() => setDirection(item)}>{text(item)}</button>
        ))}
      </div>
      {loading && <p className="py-6 text-center text-[11px] text-muted">{tr("ui.computing_compatible_ports__e35dd4")}</p>}
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
                  <span className="text-[11.5px] font-bold">{componentText(spec, 'name')}</span>
                  <span className="badge">{categoryLabel(spec.category)}</span>
                  {entry.conceptual && <span className="badge text-amber-600">{tr("ui.conceptual_a2e9cc")}</span>}
                </div>
                <p className="mt-1 text-[10px] text-muted">{componentText(spec, 'description')}</p>
                <div className="mt-1 space-y-0.5">
                  {entry.reasons.map((reason) => <p key={reason} className="font-mono text-[9px] text-emerald-600">✓ {reason}</p>)}
                </div>
              </div>
              <Plus size={14} className="mt-1 shrink-0 text-muted" />
            </button>
          );
        })}
        {!loading && !results.length && <p className="py-6 text-center text-[11px] text-muted">{tr("ui.no_compatible_components_in_this_direction__ca4e8c")}</p>}
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-[9.5px] text-muted"><GitBranch size={11} /> {tr("ui.the_new_node_is_placed_near_the_selected_one_and_con_f58ddd")}</div>
    </DialogShell>
  );
}
