import { BenchmarkDrawer } from '@/components/BenchmarkDrawer';
import { useStudio } from '@/store/graphStore';
import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, downloadText } from '@/api/client';
import { tr, useLocale } from '@/i18n';
import type { BenchmarkIndex, OfficialEvaluation } from '@/types/benchmark';

const number = (value: number | null | undefined) => typeof value === 'number' && Number.isFinite(value) ? value.toFixed(4) : '—';

export function BenchmarkPanel() {
  const locale = useLocale();
  const [index, setIndex] = useState<BenchmarkIndex | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [dataset, setDataset] = useState('');
  const [query, setQuery] = useState('');
  const [metric, setMetric] = useState('GAUC');
  const [ascending, setAscending] = useState(false);
  const [page, setPage] = useState(0);
  const [pageInput, setPageInput] = useState('1');
  const [selected, setSelected] = useState('');
  const [detail, setDetail] = useState<OfficialEvaluation | null>(null);
  const [detailError, setDetailError] = useState('');
  const [detailRevision, setDetailRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    api.benchmark().then(result => { if (active) setIndex(result); })
      .catch(err => { if (active) { setError(String(err)); useStudio.getState().toast('error', tr('benchmark.error')); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);
  useEffect(() => {
    let active = true;
    setDetail(null); setDetailError('');
    if (selected) api.benchmarkDetail(selected).then(result => { if (active) setDetail(result.evaluation); })
      .catch(err => { if (active) setDetailError(String(err)); });
    return () => { active = false; };
  }, [selected, detailRevision]);
  const entries = index?.evaluations || [];
  const datasets = [...new Set(entries.map(entry => entry.dataset))].sort();
  const metricOrder = ['GAUC', 'MRR', 'NDCG@1', 'NDCG@5', 'NDCG@10'];
  const metrics = [...new Set(entries.flatMap(entry => Object.keys(entry.metrics)))].sort((a, b) => {
    const ai = metricOrder.indexOf(a), bi = metricOrder.indexOf(b);
    return (ai < 0 ? metricOrder.length : ai) - (bi < 0 ? metricOrder.length : bi) || a.localeCompare(b, undefined, { numeric: true });
  });
  const filtered = useMemo(() => entries.filter(entry => (!dataset || entry.dataset === dataset)
    && query.trim().toLowerCase().split(/\s+/).every(token => `${entry.model} ${entry.dataset} ${entry.lm}`.toLowerCase().includes(token)))
    .sort((a, b) => {
      const av = a.metrics[metric]?.mean, bv = b.metrics[metric]?.mean;
      if (av === undefined) return bv === undefined ? a.signature.localeCompare(b.signature) : 1;
      if (bv === undefined) return -1;
      return (ascending ? av - bv : bv - av) || a.signature.localeCompare(b.signature);
    }), [index, dataset, query, metric, ascending]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 20));
  const currentPage = Math.min(page, pageCount - 1);
  useEffect(() => { setPageInput(String(currentPage + 1)); }, [currentPage]);
  const rows = filtered.slice(currentPage * 20, currentPage * 20 + 20);
  const entry = entries.find(item => item.signature === selected);
  const chart = filtered.filter(item => item.metrics[metric]).slice(0, 10).map(item => ({
    name: `${item.model} · ${item.dataset} · ${item.lm}`, value: item.metrics[metric].mean,
  }));
  const selectDataset = (value: string) => { setDataset(value); setPage(0); setSelected(''); };
  return (
    <section className="h-full overflow-auto p-3 text-[11px]" aria-label={tr('benchmark.title')}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div><h3 className="font-bold">{tr('benchmark.title')}</h3>
          <p className="text-muted">{tr('benchmark.description')}</p></div>
        <div className="flex gap-2">
          <a className="tool-btn outline" href="https://lego.qijiong.work/evaluations/" target="_blank" rel="noreferrer">{tr('benchmark.source')}</a>
          <button className="tool-btn outline" disabled={loading} onClick={() => setRevision(value => value + 1)}>{tr('benchmark.reload')}</button>
        </div>
      </div>
      {loading && <p role="status">{tr('benchmark.loading')}</p>}
      {error && <p role="alert" className="mb-2 text-red-500">{tr('benchmark.error')} {error}</p>}
      {index && <>
        <p className="mb-2 text-muted">{tr('benchmark.snapshot', { count: index.total, time: new Date(index.fetched_at * 1000).toLocaleString(locale) })}</p>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select aria-label={tr('benchmark.dataset')} className="field-input !w-auto" value={dataset} onChange={e => selectDataset(e.target.value)}>
            <option value="">{tr('benchmark.allDatasets')}</option>{datasets.map(value => <option key={value}>{value}</option>)}
          </select>
          <input aria-label={tr('benchmark.search')} className="field-input !w-52" placeholder={tr('benchmark.search')} value={query} onChange={e => { setQuery(e.target.value); setPage(0); setSelected(''); }} />
          <select aria-label={tr('benchmark.metric')} className="field-input !w-auto" value={metric} onChange={e => { setMetric(e.target.value); setPage(0); }}>
            {[...new Set([metric, ...metrics])].map(value => <option key={value}>{value}</option>)}
          </select>
          <button className="tool-btn outline" onClick={() => { setAscending(!ascending); setPage(0); }}>{tr(ascending ? 'benchmark.ascending' : 'benchmark.descending')}</button>
          <span className="text-muted">{tr('benchmark.matches', { count: filtered.length })}</span>
        </div>
        <details className="mb-3 text-muted"><summary className="cursor-pointer">{tr('benchmark.methodology')}</summary><p className="mt-2 max-w-4xl leading-relaxed">{tr('benchmark.statistics')}</p></details>
        {dataset && chart.length > 0 && <details className="mb-3 rounded-lg border border-line p-3"><summary className="cursor-pointer font-semibold">{tr('benchmark.chart')}</summary><div className="mb-3" style={{ height: Math.max(200, chart.length * 36 + 40) }} aria-label={tr('benchmark.chart')}>
          <ResponsiveContainer width="100%" height="100%"><BarChart data={chart} layout="vertical" margin={{ left: 10, right: 24 }}>
            <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="name" width={300} interval={0} tick={{ fontSize: 9 }} />
            <Tooltip /><Bar dataKey="value" name={metric} fill="#2563eb" />
          </BarChart></ResponsiveContainer>
        </div></details>}
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full whitespace-nowrap text-left"><thead className="bg-[var(--hover)]"><tr>
            {['model', 'dataset', 'lm', 'completed'].map(key => <th key={key} className="p-2">{tr('benchmark.' + key)}</th>)}
            {metrics.map(name => <th key={name} className="p-0" aria-sort={metric === name ? ascending ? 'ascending' : 'descending' : 'none'}>
              <button className={`flex w-full items-center gap-1.5 p-2 text-left hover:bg-blue-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${metric === name ? 'text-blue-500' : ''}`}
                onClick={() => { if (metric === name) setAscending(!ascending); else { setMetric(name); setAscending(false); } setPage(0); }}>
                {name} · {tr('benchmark.meanStd')}<span aria-hidden="true" className={metric === name ? '' : 'text-muted'}>{metric === name ? ascending ? '↑' : '↓' : '↕'}</span>
              </button>
            </th>)}
          </tr></thead><tbody>{rows.map(item => <tr key={item.signature} tabIndex={0} aria-label={`${item.model} · ${item.dataset} · ${item.lm}`} aria-haspopup="dialog"
            onClick={() => setSelected(item.signature)}
            onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected(item.signature); } }}
            className={`cursor-pointer border-t border-line transition-colors hover:bg-blue-500/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${selected === item.signature ? 'bg-blue-500/10' : ''}`}>
            <td className="p-2 font-semibold text-blue-500">{item.model || '—'}</td>
            <td className="p-2">{item.dataset || '—'}</td><td className="p-2">{item.lm || '—'}</td>
            <td className="p-2">{item.completed}/{item.experiments.length}</td>
            {metrics.map(name => <td key={name} className="p-2 font-mono" title={`n=${item.metrics[name]?.count ?? 0}`}>{number(item.metrics[name]?.mean)} ± {number(item.metrics[name]?.std)}</td>)}
          </tr>)}</tbody></table>
          {!rows.length && <p className="p-4 text-muted">{tr('benchmark.empty')}</p>}
        </div>
        <div className="my-2 flex flex-wrap items-center gap-3"><button className="tool-btn outline" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>{tr('benchmark.previous')}</button>
          <span>{currentPage + 1} / {pageCount}</span>
          <button className="tool-btn outline" disabled={(currentPage + 1) * 20 >= filtered.length} onClick={() => setPage(currentPage + 1)}>{tr('benchmark.next')}</button>
          <form className="flex items-center gap-2" onSubmit={event => {
            event.preventDefault();
            const requested = Number(pageInput);
            if (!Number.isInteger(requested) || requested < 1 || requested > pageCount) return;
            setPage(requested - 1); setPageInput(String(requested));
          }}>
            <label htmlFor="benchmark-page-number" className="text-muted">{tr('benchmark.page')}</label>
            <input id="benchmark-page-number" className="field-input !h-7 !w-20" type="number" min={1} max={pageCount} step={1} required
              value={pageInput} onChange={event => setPageInput(event.target.value)} />
            <button className="tool-btn outline" type="submit">{tr('benchmark.jump')}</button>
          </form>
        </div>
      </>}
      {entry && <BenchmarkDrawer title={`${entry.model} · ${entry.dataset} · ${entry.lm}`} onClose={() => setSelected('')}>
        <div className="mb-2 flex flex-wrap gap-2">{Object.entries(entry.metrics).map(([name, value]) => <div className="rounded border border-line p-2" key={name}><b>{name}</b><p className="font-mono">{number(value.mean)} ± {number(value.std)}</p><small>n={value.count}</small></div>)}</div>
        <h5 className="mb-1 font-semibold">{tr('benchmark.seeds')}</h5>
        <div className="overflow-x-auto"><table className="w-full whitespace-nowrap text-left"><thead><tr><th className="p-1">Seed</th><th className="p-1">{tr('benchmark.status')}</th>{Object.keys(entry.metrics).map(name => <th className="p-1" key={name}>{name}</th>)}</tr></thead>
          <tbody>{entry.experiments.map((exp, i) => <tr className="border-t border-line" key={`${exp.seed}-${i}`}><td className="p-1">{exp.seed}</td><td className="p-1">{tr(exp.is_completed ? 'benchmark.done' : 'benchmark.pending')}</td>{Object.keys(entry.metrics).map(name => <td className="p-1 font-mono" key={name}>{number(exp.performance?.[name])}</td>)}</tr>)}</tbody></table></div>
        <details className="my-3"><summary className="cursor-pointer">{tr('benchmark.command')}</summary><p className="mt-2 break-all font-mono text-muted">{entry.command}</p></details>
        {entry.comment && <p>{entry.comment}</p>}
        {detailError && <p role="alert" className="text-red-500">{tr('benchmark.error')} {detailError} <button className="tool-btn outline" onClick={() => setDetailRevision(value => value + 1)}>{tr('benchmark.reload')}</button></p>}
        {!detail && !detailError && <p role="status">{tr('benchmark.loadingDetail')}</p>}
        {detail && <>
          <button className="tool-btn outline my-2" onClick={() => { downloadText(`benchmark-${detail.signature}.json`, JSON.stringify(detail, null, 2), 'application/json'); useStudio.getState().toast('success', tr('benchmark.exported')); }}>{tr('benchmark.download')}</button>
          <details><summary className="cursor-pointer">{tr('benchmark.raw')}</summary><pre className="code-view mt-2 max-h-80 overflow-auto text-[10px]">{JSON.stringify(detail, null, 2)}</pre></details>
        </>}
      </BenchmarkDrawer>}
    </section>
  );
}
