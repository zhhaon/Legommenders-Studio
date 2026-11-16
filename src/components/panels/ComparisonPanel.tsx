import { componentText } from '@/i18n/display';
import type { RunRecord } from '@/types/api';
import { MixedComparison } from './MixedComparison';
import { tr, useLocale } from '@/i18n';
import { api } from '@/api/client';
import { DeleteResourceDialog } from '@/components/ResourceButton';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Columns3, FlaskConical, Trash2 } from 'lucide-react';
import { useStudio } from '@/store/graphStore';

export function ComparisonPanel() {
  useLocale();
  const runs = useStudio((s) => s.runs);
  const components = useStudio((s) => s.components);
  const datasetName = (run: RunRecord) => {
    const path = run.dataset.replace(/\\/g, "/").replace(/^\.\//, "");
    const component = Object.values(components).find(item => item.category === "dataset" && item.parameters.some(param => param.name === "data_config" && param.default === path));
    return component ? componentText(component) : path.split("/").pop()?.replace(/\.ya?ml$/i, "") || String(run.config.data_name || "—");
  };
  const completed = useMemo(() => runs.filter((r) => r.status === 'completed'), [runs]);
  const [selected, setSelected] = useState<string[]>([]);
  const [officialCount, setOfficialCount] = useState(0);
  const [actionsTarget, setActionsTarget] = useState<HTMLDivElement | null>(null);


  const [manageHistory, setManageHistory] = useState(false);
  const [deleteSelected, setDeleteSelected] = useState<string[]>([]);
  const [deleting, setDeleting] = useState<string[] | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const selectAll = useRef<HTMLInputElement>(null);
  const marked = completed.filter(run => deleteSelected.includes(run.run_id)).map(run => run.run_id);
  const allMarked = completed.length > 0 && marked.length === completed.length;
  useEffect(() => {
    if (selectAll.current) selectAll.current.indeterminate = marked.length > 0 && !allMarked;
  }, [marked.length, allMarked]);
  const deleteHistory = async () => {
    if (!deleting?.length || deleteBusy) return;
    const ids = deleting;
    setDeleting(null);
    setDeleteBusy(true);
    setDeleteError('');
    const removed: string[] = [];
    const errors: string[] = [];
    for (const id of ids) {
      try { await api.deleteRun(id); removed.push(id); }
      catch (error) { errors.push(`#${id.slice(0, 6)}: ${String(error)}`); }
    }
    setSelected(previous => previous.filter(value => !removed.includes(value)));
    setDeleteSelected(previous => previous.filter(value => !removed.includes(value)));
    const state = useStudio.getState();
    useStudio.setState({ runs: state.runs.filter(run => !removed.includes(run.run_id)),
      ...(state.currentRunId && removed.includes(state.currentRunId) ? { currentRunId: null, currentRun: null } : {}) });
    await useStudio.getState().refreshRuns();
    if (errors.length) setDeleteError(tr("messages.f760cf9a64c6", { p0: errors.join(' · ') }));
    setDeleteBusy(false);
  };

  const chosen = completed.filter((run) => selected.includes(run.run_id));
  const toggle = (id: string) => setSelected(previous => previous.includes(id)
    ? previous.filter(item => item !== id)
    : previous.length + officialCount < 6 ? [...previous, id] : previous);

  return (
    <div className="flex h-full min-h-0 flex-col p-3">
      <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2 bg-surface">
        <div>
          <h3 className="flex items-center gap-1.5 text-[11px] font-bold"><Columns3 size={13} /> {tr("ui.model_comparison_376f7a")}</h3>
          <p className="mt-0.5 text-[9.5px] text-muted">{tr('compare.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge">{completed.length} {tr("ui.completed_run_s__99053c")}</span>
          <button className={`tool-btn ${manageHistory ? 'primary' : 'outline'} !h-7 !text-[10px]`}
            disabled={deleteBusy || !completed.length} aria-pressed={manageHistory}
            onClick={() => { setManageHistory(value => !value); setDeleteSelected([]); }}>
            {manageHistory ? tr("ui.done_e9b450") : tr("ui.manage_records_ce781e")}
          </button>
          <div ref={setActionsTarget} className="flex items-center gap-2" />
          {!completed.length && <button className="tool-btn outline !h-7 !text-[10px]" disabled>{tr('compare.add')}</button>}
          {!completed.length && <button className="tool-btn outline !h-7 !text-[10px]" disabled>{tr('compare.view')}</button>}
        </div>
      </div>

      {deleteError && <p role="alert" className="mb-2 text-[11px] text-red-500">{deleteError}</p>}
      {deleting && <DeleteResourceDialog title={deleting.length === 1 ? tr("ui.delete_training_record__0cecf4") : tr("messages.f25e0db5108e", { p0: deleting.length })}
        description={tr("messages.e4e051214687", { p0: deleting.length })}
        onCancel={() => setDeleting(null)} onDelete={() => void deleteHistory()} />}
      {!completed.length ? (
        <div className="rounded-lg border border-dashed border-line bg-[var(--hover)] p-6 text-center">
          <FlaskConical size={26} className="mx-auto mb-2 text-muted/50" />
          <p className="text-[12px] font-semibold">{tr("ui.no_completed_experiments_d5f661")}</p>
          <p className="mt-1 text-[10px] text-muted">{tr('compare.chooseLocal')}</p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          {manageHistory && <div className="mb-3 flex items-center gap-3 text-[10.5px]">
            <label className="flex items-center gap-1.5">
              <input ref={selectAll} type="checkbox" aria-label={tr("ui.select_all_records_e89606")} checked={allMarked} disabled={deleteBusy}
                onChange={() => setDeleteSelected(allMarked ? [] : completed.map(run => run.run_id))} /> {tr("ui.select_all_913aff")} </label>
            <span className="text-muted">{marked.length} {tr("ui.selected_835f3b")}</span>
            <button className="tool-btn outline !text-[10px] hover:!text-red-500" disabled={!marked.length || deleteBusy}
              onClick={() => setDeleting(marked)}><Trash2 size={13} />{deleteBusy ? tr('actions.deleting') : tr("ui.delete_selected_8516a7")}</button>
          </div>}
          <div className="mb-2 grid min-h-0 flex-1 auto-rows-min grid-cols-3 gap-2 overflow-y-auto">
            {completed.map((run) => (
              <div key={run.run_id} className="flex min-w-0 items-center gap-2">
              {manageHistory && <input type="checkbox" aria-label={tr("messages.7803ed2d6777", { p0: run.run_id })} checked={deleteSelected.includes(run.run_id)} disabled={deleteBusy}
                onChange={() => setDeleteSelected(previous => previous.includes(run.run_id) ? previous.filter(id => id !== run.run_id) : [...previous, run.run_id])} />}
              <button
                className={`tool-btn !block !h-auto !whitespace-normal min-w-0 flex-1 !px-3 !py-2 text-left !text-[11px] ${selected.includes(run.run_id) ? 'primary' : 'outline'}`}
                aria-pressed={selected.includes(run.run_id)}
                disabled={!selected.includes(run.run_id) && chosen.length + officialCount >= 6}
                onClick={() => toggle(run.run_id)}>
                <span className="flex items-start justify-between gap-3"><span className="min-w-0 break-words font-semibold">{run.model_label}</span><span className="max-w-[55%] break-words text-right font-semibold" data-card-dataset>{datasetName(run)}</span></span>
                <span className="mt-1 flex items-center justify-between gap-3 text-[9px] opacity-75"><span className="min-w-0 truncate font-mono" data-card-signature title={run.signature || run.run_id}>{run.signature || run.run_id}</span><span className="shrink-0">{Object.keys(run.metrics).length} {tr("ui.metrics_966b97")}</span></span></button>
              {manageHistory && <button className="tool-btn !h-7 !px-1.5 text-muted hover:!text-red-500" title={tr("ui.delete_training_record_cda809")}
                aria-label={tr("messages.a12915ab61cc", { p0: run.run_id })} disabled={deleteBusy} onClick={() => setDeleting([run.run_id])}><Trash2 size={13} /></button>}
              </div>
            ))}
          </div>
          <MixedComparison chosen={chosen} onOfficialCount={setOfficialCount} actionsTarget={actionsTarget} />
        </div>
      )}
    </div>
  );
}

