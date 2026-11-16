import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { api, downloadText } from '@/api/client';
import { tr, useLocale } from '@/i18n';
import { BenchmarkDrawer } from '@/components/BenchmarkDrawer';
import type { RunRecord } from '@/types/api';
import type { BenchmarkEntry, BenchmarkIndex, OfficialEvaluation } from '@/types/benchmark';
import { baselineDelta, datasetMatch, formatScore, orderedMetrics, runLM } from '@/utils/benchmarkComparison';

export function MixedComparison({ chosen, onOfficialCount, actionsTarget }: { chosen: RunRecord[]; onOfficialCount: (count: number) => void; actionsTarget: HTMLElement | null }) {
  useLocale();
  const [official, setOfficial] = useState<BenchmarkEntry[]>([]);
  const [baselineId, setBaselineId] = useState('');
  const [picker, setPicker] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [anchorId, setAnchorId] = useState('');
  const [manual, setManual] = useState<Record<string, string>>({});
  const [index, setIndex] = useState<BenchmarkIndex | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState<string[]>([]);
  const [detail, setDetail] = useState<{ kind: 'local'; run: RunRecord } | { kind: 'official'; entry: BenchmarkEntry } | null>(null);
  const anchor = chosen.find(run => run.run_id === anchorId) || chosen[0];
  const match = anchor ? datasetMatch(anchor.dataset) : { key: null, blocked: false };
  const target = match.key || (!match.blocked && anchor ? manual[anchor.run_id] : '') || '';
  const datasets = [...new Set(index?.evaluations.map(item => item.dataset) || [])].sort();
  const rows = index?.evaluations.filter(item => item.dataset === target && item.completed > 0 && Object.keys(item.metrics).length > 0
    && query.trim().toLowerCase().split(/\s+/).every(token => `${item.model} ${item.lm}`.toLowerCase().includes(token))) || [];
  const baseline = official.find(item => item.signature === baselineId) || official[0];
  const metricNames = orderedMetrics([...chosen.flatMap(run => Object.keys(run.metrics)), ...official.flatMap(item => Object.keys(item.metrics))]);
  useEffect(() => { onOfficialCount(official.length); }, [official.length, onOfficialCount]);
  useEffect(() => {
    if (!picker || (index && revision === 0)) return;
    let active = true; setBusy(true); setError('');
    api.benchmark().then(result => { if (active) setIndex(result); }).catch(err => { if (active) setError(String(err)); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [picker, revision]);
  function openPicker() { setPending(official.map(item => item.signature)); setAnchorId(chosen[0]?.run_id || ''); setQuery(''); setPicker(true); }
  function apply() {
    const selected = (index?.evaluations || []).filter(item => pending.includes(item.signature));
    if (selected.length + chosen.length > 6) return;
    setOfficial(selected); setPicker(false);
    if (!selected.some(item => item.signature === baselineId)) setBaselineId(selected[0]?.signature || '');
  }
  function removeOfficial(id: string) {
    const remaining = official.filter(item => item.signature !== id);
    setOfficial(remaining);
    if (!remaining.some(item => item.signature === baselineId)) setBaselineId(remaining[0]?.signature || '');
  }
  function keyFor(run: RunRecord) { const resolved = datasetMatch(run.dataset); return resolved.key || (!resolved.blocked && manual[run.run_id]) || ''; }
  return <div className="shrink-0">
    {actionsTarget && createPortal(<>
      <button className="tool-btn outline !h-7 !text-[10px]" disabled={!chosen.length || chosen.length >= 6} onClick={openPicker}>{tr('compare.add')}</button>
      <button className="tool-btn outline !h-7 !text-[10px]" disabled={!chosen.length && !official.length} onClick={() => setResultsOpen(true)}>{tr('compare.view')}</button>
    </>, actionsTarget)}
    <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted">
      <span>{tr('compare.limit', { count: chosen.length + official.length })}</span>
      {!chosen.length && !official.length && <span>{tr('compare.chooseLocal')}</span>}
      {official.map(item => <button key={item.signature} className="tool-btn outline !h-6 !text-[9px]" onClick={() => removeOfficial(item.signature)} aria-label={tr('compare.remove', { model: item.model })}>Benchmark · {item.model} · {item.dataset} ×</button>)}
    </div>
    {resultsOpen && !detail && !picker && <BenchmarkDrawer wide title={tr('ui.model_comparison_376f7a')} onClose={() => setResultsOpen(false)}>
      <div className="mb-3 flex flex-wrap items-center gap-3">
      {official.length > 0 && <label className="flex items-center gap-2 text-[10px]">{tr('compare.baseline')}
        <select className="field-input !h-7 !w-52" value={baseline?.signature || ''} onChange={e => setBaselineId(e.target.value)}>
          {official.map(item => <option key={item.signature} value={item.signature}>{item.model} · {item.dataset} · {item.lm}</option>)}
        </select></label>}
        <span className="text-muted">{tr('compare.limit', { count: chosen.length + official.length })}</span>
      </div>
    {(chosen.length > 0 || official.length > 0) && <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[600px] whitespace-nowrap text-[10.5px]"><thead className="bg-[var(--hover)]"><tr>
        <th className="p-2 text-left">{tr('compare.field')}</th>
        {chosen.map(run => <th key={run.run_id} className="p-2 text-left">{run.model_label}<span className="ml-1 text-[9px] text-muted">#{run.run_id.slice(0, 6)}</span></th>)}
        {official.map(item => <th key={item.signature} className="p-2 text-left">{item.model}<button aria-label={tr('compare.remove', { model: item.model })} className="ml-2 text-muted" onClick={() => removeOfficial(item.signature)}>×</button></th>)}
      </tr></thead><tbody>
        <Row label={tr('compare.source')} local={chosen.map(() => tr('compare.local'))} official={official.map(item => `Benchmark${item.signature === baseline?.signature ? ' · ' + tr('compare.baseline') : ''}`)} />
        <Row label={tr('benchmark.dataset')} local={chosen.map(run => keyFor(run) ? `${keyFor(run)}${manual[run.run_id] ? ' · ' + tr('compare.manual') : ''}` : run.dataset || '—')} official={official.map(item => item.dataset)} />
        <Row label="LM" local={chosen.map(runLM)} official={official.map(item => item.lm || '—')} />
        {metricNames.map(name => <tr key={name} className="border-t border-line"><th className="p-2 text-left font-medium">{name}</th>
          {chosen.map(run => {
            const delta = baselineDelta(run.metrics[name], baseline?.metrics[name]?.mean, Boolean(baseline && keyFor(run) === baseline.dataset));
            return <td key={run.run_id} className="p-2 font-mono">{formatScore(run.metrics[name])}{delta !== null && <span className="ml-2 text-muted" title={tr('compare.delta')}>({delta})</span>}</td>;
          })}
          {official.map(item => <td key={item.signature} className="p-2 font-mono" title={`n=${item.metrics[name]?.count ?? 0}`}>{formatScore(item.metrics[name]?.mean)} ± {formatScore(item.metrics[name]?.std)}</td>)}
        </tr>)}
        <Row label={tr('compare.repeats')} local={chosen.map(() => '1')} official={official.map(item => String(item.completed))} />
        <tr className="border-t border-line"><th className="p-2 text-left font-medium">{tr('compare.details')}</th>
          {chosen.map(run => <td key={run.run_id} className="p-2"><button className="tool-btn outline !h-6" onClick={() => setDetail({ kind: 'local', run })}>{tr('compare.details')}</button></td>)}
          {official.map(entry => <td key={entry.signature} className="p-2"><button className="tool-btn outline !h-6" onClick={() => setDetail({ kind: 'official', entry })}>{tr('compare.details')}</button></td>)}
        </tr>
      </tbody></table>
    </div>}
    {official.length > 0 && <p className="mt-2 text-[9.5px] text-muted">{tr('compare.note')}</p>}
    {baseline && chosen.filter(run => keyFor(run) === baseline.dataset && runLM(run) !== '—' && baseline.lm && runLM(run) !== baseline.lm).map(run => <p key={run.run_id} className="mt-1 text-[9.5px] text-amber-600">{tr('compare.lmDifference', { model: run.model_label, local: runLM(run), official: baseline.lm })}</p>)}
    </BenchmarkDrawer>}
    {picker && <BenchmarkDrawer title={tr('compare.add')} onClose={() => setPicker(false)}>
      <div className="sticky top-0 z-10 mb-3 space-y-2 bg-surface pb-3">
        <label className="block">{tr('compare.reference')}<select className="field-input mt-1" value={anchor?.run_id || ''} onChange={e => { setAnchorId(e.target.value); setQuery(''); }}>
          {chosen.map(run => <option key={run.run_id} value={run.run_id}>{run.model_label} · {run.dataset} · #{run.run_id.slice(0, 6)}</option>)}
        </select></label>
        {match.key && <p>{tr('compare.matched', { dataset: match.key })}</p>}
        {match.blocked && <p className="text-amber-600">{tr('compare.blocked')}</p>}
        {!match.key && !match.blocked && anchor && <label className="block">{tr('compare.unknown')}<select aria-label={tr('compare.manual')} className="field-input mt-1" value={manual[anchor.run_id] || ''} onChange={e => setManual(values => ({ ...values, [anchor.run_id]: e.target.value }))}>
          <option value="">{tr('compare.selectDataset')}</option>{datasets.map(dataset => <option key={dataset}>{dataset}</option>)}
        </select><span className="text-muted">{tr('compare.manualNote')}</span></label>}
        <input className="field-input" aria-label={tr('compare.search')} placeholder={tr('compare.search')} value={query} onChange={e => setQuery(e.target.value)} />
        <div className="flex items-center justify-between"><span>{tr('compare.limit', { count: pending.length + chosen.length })}</span><button className="tool-btn primary" disabled={busy || Boolean(error) || pending.length + chosen.length > 6} onClick={apply}>{tr('compare.apply')}</button></div>
        <div className="flex flex-wrap gap-1">{(index?.evaluations || []).filter(item => pending.includes(item.signature)).map(item => <button key={item.signature} className="tool-btn outline !h-6 !text-[9px]" onClick={() => setPending(ids => ids.filter(id => id !== item.signature))}>{item.model} · {item.dataset} · {item.lm} ×</button>)}</div>
      </div>
      {busy && <p role="status">{tr('benchmark.loading')}</p>}
      {error && <div role="alert">{tr('benchmark.error')} {error}<button className="tool-btn outline" onClick={() => setRevision(value => value + 1)}>{tr('benchmark.reload')}</button></div>}
      {!busy && !error && rows.length === 0 && <p className="text-muted">{tr('benchmark.empty')} <a href="#/benchmark" onClick={() => setPicker(false)} className="text-blue-500">{tr('benchmark.browse')}</a></p>}
      <div className="space-y-2">{rows.map(item => <label key={item.signature} className="flex cursor-pointer items-start gap-3 rounded-lg border border-line p-3 hover:bg-blue-500/5">
        <input className="mt-1" type="checkbox" checked={pending.includes(item.signature)} disabled={!pending.includes(item.signature) && pending.length + chosen.length >= 6}
          onChange={e => setPending(ids => e.target.checked ? [...ids, item.signature] : ids.filter(id => id !== item.signature))} />
        <span><b>{item.model} · {item.lm}</b><span className="ml-2 text-muted">{item.dataset}</span><p className="mt-1 text-muted">GAUC {formatScore(item.metrics.GAUC?.mean)} ± {formatScore(item.metrics.GAUC?.std)} · n={item.metrics.GAUC?.count ?? 0}</p><p className="mt-1 break-all text-[9px] text-muted">{item.command}</p></span>
      </label>)}</div>
    </BenchmarkDrawer>}
    {detail && <ComparisonDetails selection={detail} manual={detail.kind === 'local' ? manual[detail.run.run_id] : undefined} baseline={baseline} onClose={() => setDetail(null)} />}
  </div>;
}
function Row({ label, local, official }: { label: string; local: string[]; official: string[] }) {
  return <tr className="border-t border-line"><th className="p-2 text-left font-medium text-muted">{label}</th>{[...local, ...official].map((value, i) => <td key={i} className="max-w-64 truncate p-2" title={value}>{value}</td>)}</tr>;
}

function ComparisonDetails({ selection, onClose, manual, baseline }: {
  selection: { kind: 'local'; run: RunRecord } | { kind: 'official'; entry: BenchmarkEntry };
  onClose: () => void; manual?: string; baseline?: BenchmarkEntry;
}) {
  const [data, setData] = useState<RunRecord | OfficialEvaluation | null>(null);
  const [error, setError] = useState(''); const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true; setData(null); setError('');
    const promise = selection.kind === 'local' ? api.run(selection.run.run_id) : api.benchmarkDetail(selection.entry.signature).then(result => result.evaluation);
    promise.then(result => { if (active) setData(result); }).catch(err => { if (active) setError(String(err)); });
    return () => { active = false; };
  }, [selection, retry]);
  const local = selection.kind === 'local';
  const run = local && data ? data as RunRecord : null;
  const evaluation = !local && data ? data as OfficialEvaluation : null;
  const title = selection.kind === 'local' ? selection.run.model_label : `${selection.entry.model} · ${selection.entry.dataset} · ${selection.entry.lm}`;
  return <BenchmarkDrawer title={title} onClose={onClose}>
    <p className="mb-3 rounded border border-line p-3 text-muted">{tr('compare.protocol')}{manual && ` ${tr('compare.manual')}: ${manual}`}</p>
    {error && <p role="alert">{error}<button className="tool-btn outline" onClick={() => setRetry(n => n + 1)}>{tr('benchmark.reload')}</button></p>}
    {!data && !error && <p role="status">{tr('benchmark.loadingDetail')}</p>}
    {run && <>
      <p className="mb-2">{tr('compare.local')} · {run.dataset} · LM {runLM(run)}</p>
      <dl className="mb-3 grid grid-cols-2 gap-2">{Object.entries(run.params).map(([key, value]) => <div className="rounded border border-line p-2" key={key}><dt className="text-muted">{key}</dt><dd className="break-all font-mono">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</dd></div>)}</dl>
      {baseline && <details className="my-3"><summary>{tr('compare.baselineSettings')}</summary><p className="mt-2 break-all font-mono">{baseline.command}</p></details>}
      <details className="my-3"><summary>{tr('compare.structure')}</summary><pre className="mt-2 overflow-auto">{run.model_yaml || JSON.stringify(run.graph, null, 2)}</pre></details>
      <details className="my-3"><summary>{tr('benchmark.command')}</summary><pre className="mt-2 whitespace-pre-wrap break-all">{JSON.stringify(run.command)}</pre></details>
      <details className="my-3"><summary>{tr('ui.logs_126dd3')}</summary><pre className="mt-2 overflow-auto">{run.log_lines.join('\n')}</pre></details>
    </>}
    {evaluation && <>
      <h3 className="mb-2 font-semibold">{tr('benchmark.seeds')}</h3>
      <div className="overflow-x-auto"><table className="w-full whitespace-nowrap text-left"><thead><tr><th className="p-2">Seed</th>{orderedMetrics(evaluation.experiments.flatMap(exp => Object.keys(exp.performance || {}))).map(name => <th key={name} className="p-2">{name}</th>)}</tr></thead><tbody>{evaluation.experiments.map((exp, i) => <tr key={i} className="border-t border-line"><td className="p-2">{exp.seed}{!exp.is_completed && ` · ${tr('benchmark.pending')}`}</td>{orderedMetrics(evaluation.experiments.flatMap(e => Object.keys(e.performance || {}))).map(name => <td key={name} className="p-2 font-mono">{formatScore(exp.performance?.[name])}</td>)}</tr>)}</tbody></table></div>
      <p className="my-3 break-all font-mono text-muted">{evaluation.command}</p>
      <details className="my-3"><summary>{tr('benchmark.raw')}</summary><pre className="mt-2 overflow-auto">{JSON.stringify(evaluation.configuration, null, 2)}</pre></details>
    </>}
    {data && <button className="tool-btn outline my-2" onClick={() => downloadText(`comparison-${local ? (data as RunRecord).run_id : (data as OfficialEvaluation).signature}.json`, JSON.stringify(data, null, 2), 'application/json')}>{tr('compare.download')}</button>}
  </BenchmarkDrawer>;
}
