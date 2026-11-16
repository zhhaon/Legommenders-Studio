import { tr, useLocale } from '@/i18n';
import { useEffect, useState } from 'react';
import { accumulationSteps } from '@/utils/batchSize';
import { Play } from 'lucide-react';
import { MetricSettings } from '@/components/MetricSettings';
import { useStudio } from '@/store/graphStore';
import { devicePatch, deviceValue } from '@/utils/deviceOptions';

export function TrainingSettings() {
  useLocale();
  const { name, train: settings } = useStudio((state) => state.graph);
  const update = useStudio((state) => state.updateTrain);
  const rename = useStudio((state) => state.renameGraph);
  const environment = useStudio((state) => state.environment);
  const devices = environment?.cuda_devices || Array.from(
    { length: environment?.cuda_device_count || 0 }, (_, index) => ({ index, name: 'GPU' }));
  const missingDevice = settings.device === 'cuda' && settings.cuda_index != null
    && !devices.some((gpu) => gpu.index === settings.cuda_index);

  return (
    <section aria-label={tr("ui.training_settings_a9d521")} className="space-y-2">
      <label className="field-label"> {tr("ui.experiment_name_13ecb5")} <input className="field-input" value={name} onChange={(event) => rename(event.target.value)} />
      </label>
      <BatchSizeFields micro={settings.batch_size} steps={settings.accumulate_batch}
        onChange={(micro, steps) => update({ batch_size: micro, accumulate_batch: steps })} />
      <NumberField label={tr("ui.learning_rate_d06fa7")} value={settings.lr} min={0.000001} max={1} decimal
        onChange={(value) => update({ lr: value })} />
      <NumberField label={tr("ui.hidden_size_6e7174")} value={settings.hidden_size} min={8} max={8192}
        onChange={(value) => update({ hidden_size: value })} />
      <NumberField label={tr("ui.epochs_8f4dcf")} value={settings.epochs} min={1} max={200}
        onChange={(value) => update({ epochs: value })} />
      <label className="field-label"> {tr("ui.device_a5a74a")} <select className="field-input" value={deviceValue(settings)}
          onChange={(event) => update(devicePatch(event.target.value))}>
          <option value="cpu">CPU</option>
          <option value="cuda">{tr("ui.cuda_auto__d8bb29")}</option>
          <option value="auto">{tr("ui.auto_c614ba")}</option>
          {devices.map((gpu) => <option key={gpu.index} value={`cuda:${gpu.index}`}>
            CUDA:{gpu.index}
          </option>)}
          {missingDevice && <option value={`cuda:${settings.cuda_index}`} disabled>
            CUDA:{settings.cuda_index} {tr("ui._unavailable__b2cac2")} </option>}
        </select>
      </label>
      <MetricSettings />
      <p className="field-help">{tr('demo.notice')}</p>
      <div className="flex gap-1.5 pt-1">
        <button className="tool-btn primary flex-1 justify-center !text-[10px]" disabled title={tr('demo.disabled')}
          ><Play size={12} fill="currentColor" /> {tr("ui.start_train_82f729")}</button>
        <button className="tool-btn outline !text-[10px]" disabled title={tr('demo.disabled')}
          >{tr("ui.preflight_8016a4")}</button>
      </div>
    </section>
  );
}

function BatchSizeFields({ micro, steps, onChange }: {
  micro: number; steps: number; onChange: (micro: number, steps: number) => void;
}) {
  useLocale();
  const [globalDraft, setGlobalDraft] = useState(String(micro * steps));
  const [microDraft, setMicroDraft] = useState(String(micro));
  useEffect(() => {
    setGlobalDraft(String(micro * steps));
    setMicroDraft(String(micro));
  }, [micro, steps]);
  const computed = accumulationSteps(globalDraft, microDraft);
  const change = (global: string, local: string) => {
    setGlobalDraft(global);
    setMicroDraft(local);
    const count = accumulationSteps(global, local);
    if (count !== null) onChange(Number(local), count);
  };
  const resetInvalid = () => {
    if (computed === null) {
      setGlobalDraft(String(micro * steps));
      setMicroDraft(String(micro));
    }
  };
  return (
    <div className="space-y-2">
      <label className="field-label"> {tr("ui.global_batch_size_eb0956")} <input className="field-input" type="number" min={1} max={16777216} step={1}
          value={globalDraft} aria-invalid={computed === null}
          onChange={(event) => change(event.target.value, microDraft)} onBlur={resetInvalid} />
      </label>
      <label className="field-label"> {tr("ui.micro_batch_size_192168")} <input className="field-input" type="number" min={1} max={4096} step={1}
          value={microDraft} aria-invalid={computed === null}
          onChange={(event) => change(globalDraft, event.target.value)} onBlur={resetInvalid} />
      </label>
      <label className="field-label"> {tr("ui.accumulate_steps_d96462")} <input className="field-input !bg-gray-100 !text-gray-500 disabled:cursor-not-allowed dark:!bg-gray-800 dark:!text-gray-400"
          type="number" value={computed ?? ''} disabled readOnly />
      </label>
      {computed === null && <p className="field-help" role="alert"> {tr("ui.enter_positive_integers_global_batch_size_must_be_a__73c679")} </p>}
    </div>
  );
}

function NumberField({ label, value, min, max, decimal = false, onChange }: {
  label: string; value: number; min: number; max: number; decimal?: boolean; onChange: (value: number) => void;
}) {
  useLocale();
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? String(value);
  const parsed = Number(shown);
  const valid = shown.trim() !== '' && Number.isFinite(parsed) && parsed >= min && parsed <= max
    && (decimal || Number.isInteger(parsed));
  return (
    <label className="field-label">
      {label}
      <input className="field-input" type="number" min={min} max={max} step={decimal ? 'any' : 1}
        value={shown} aria-invalid={!valid}
        onChange={(event) => {
          const raw = event.target.value;
          setDraft(raw);
          const number = Number(raw);
          if (raw.trim() && Number.isFinite(number) && number >= min && number <= max
            && (decimal || Number.isInteger(number))) onChange(number);
        }}
        onBlur={() => setDraft(null)} />
      {!valid && <span className="field-help">{tr("ui.enter_2b9ece")} {decimal ? tr("ui.a_number_c37f5d") : tr("ui.an_integer_3c3d09")} {tr("ui.between_709634")} {min} {tr("ui.and_cffa50")} {max}.</span>}
    </label>
  );
}
