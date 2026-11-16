import { tr, useLocale } from '@/i18n';
import { useState } from 'react';
import { devMetricOptions, selectDevMetric } from '@/utils/metricOptions';
import { Plus, X } from 'lucide-react';
import { useStudio } from '@/store/graphStore';

export function MetricSettings() {
  useLocale();
  const catalog = useStudio((state) => state.catalog?.metrics);
  const { metrics, dev_metric: devMetric } = useStudio((state) => state.graph.train);
  const update = useStudio((state) => state.updateTrain);
  const devOptions = devMetricOptions(catalog || [], metrics, devMetric);
  const [name, setName] = useState('NDCG');
  const [argument, setArgument] = useState('10');
  const spec = catalog?.find((metric) => metric.name === name);
  const number = Number(argument);
  const valid = !spec?.argument || (argument.trim() !== '' && (
    spec.argument === 'cutoff'
      ? Number.isSafeInteger(number) && number >= 1
      : number >= 0 && number <= 1
  ));
  const metric = spec?.argument
    ? name + '@' + (name === 'F1' && Number.isInteger(number) ? number.toFixed(1) : number)
    : name;

  return (
    <fieldset className="space-y-2">
      <legend className="field-label">{tr("ui.evaluation_metrics_9945b3")}</legend>
      <div className="flex flex-wrap gap-1">
        {metrics.map((value) => (
          <span className="badge flex items-center gap-1" key={value}>
            {value}
            <button type="button" aria-label={tr("ui.remove__1680e3") + value} disabled={metrics.length <= 1}
              onClick={() => {
                const remaining = metrics.filter((selected) => selected !== value);
                update({ metrics: remaining, dev_metric: devMetric === value ? remaining[0] : devMetric });
              }}>
              <X size={11} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1">
        <select className="field-input" aria-label={tr("ui.metric_to_add_848995")} value={name}
          onChange={(event) => {
            const value = event.target.value;
            setName(value);
            setArgument(value === 'F1' ? '0.5' : '10');
          }}>
          {catalog?.map((item) => <option key={item.name}>{item.name}</option>)}
        </select>
        {spec?.argument && <input type="number" className="field-input !w-16"
          aria-label={spec.argument === 'cutoff' ? tr("ui.metric_cutoff_k_cbef15") : tr("ui.f1_threshold_c4451f")} value={argument}
          min={spec.argument === 'cutoff' ? 1 : 0} max={spec.argument === 'threshold' ? 1 : undefined}
          step={spec.argument === 'cutoff' ? 1 : 'any'} onChange={(event) => setArgument(event.target.value)} />}
        <button type="button" className="tool-btn outline" aria-label={tr("ui.add_metric_0a6b5a")}
          disabled={!spec || !valid || metrics.includes(metric)}
          onClick={() => update({ metrics: [...metrics, metric] })}><Plus size={13} /></button>
      </div>
      <label className="field-label"> {tr("ui.dev_metric_9dd1e5")} <select className="field-input" value={devMetric}
          onChange={(event) => update(selectDevMetric(metrics, event.target.value))}>
          {devOptions.map((value) => <option key={value}>{value}</option>)}
        </select>
      </label>
    </fieldset>
  );
}
