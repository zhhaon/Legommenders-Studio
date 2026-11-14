import { useEffect, useState } from 'react';
import { accumulationSteps } from '@/utils/batchSize';
import { MetricSettings } from '@/components/MetricSettings';
import { useStudio } from '@/store/graphStore';
import { devicePatch, deviceValue } from '@/utils/deviceOptions';

export function TrainingSettings() {
  const { name, train: settings } = useStudio((state) => state.graph);
  const update = useStudio((state) => state.updateTrain);
  const rename = useStudio((state) => state.renameGraph);
  const environment = useStudio((state) => state.environment);
  const devices = environment?.cuda_devices || Array.from(
    { length: environment?.cuda_device_count || 0 }, (_, index) => ({ index, name: 'GPU' }));
  const missingDevice = settings.device === 'cuda' && settings.cuda_index != null
    && !devices.some((gpu) => gpu.index === settings.cuda_index);

  return (
    <section aria-label="Training settings" className="space-y-2">
      <label className="field-label">
        Experiment Name
        <input className="field-input" value={name} onChange={(event) => rename(event.target.value)} />
      </label>
      <BatchSizeFields micro={settings.batch_size} steps={settings.accumulate_batch}
        onChange={(micro, steps) => update({ batch_size: micro, accumulate_batch: steps })} />
      <NumberField label="Learning Rate" value={settings.lr} min={0.000001} max={1} decimal
        onChange={(value) => update({ lr: value })} />
      <NumberField label="Hidden Size" value={settings.hidden_size} min={8} max={8192}
        onChange={(value) => update({ hidden_size: value })} />
      <NumberField label="Epochs" value={settings.epochs} min={1} max={200}
        onChange={(value) => update({ epochs: value })} />
      <label className="field-label">
        Device
        <select className="field-input" value={deviceValue(settings)}
          onChange={(event) => update(devicePatch(event.target.value))}>
          <option value="cpu">CPU</option>
          <option value="cuda">CUDA(Auto)</option>
          <option value="auto">Auto</option>
          {devices.map((gpu) => <option key={gpu.index} value={`cuda:${gpu.index}`}>
            CUDA:{gpu.index}
          </option>)}
          {missingDevice && <option value={`cuda:${settings.cuda_index}`} disabled>
            CUDA:{settings.cuda_index} (unavailable)
          </option>}
        </select>
      </label>
      <MetricSettings />
      <p className="field-help">Configuration editing only. Training, preflight and resource downloads are disabled in this static demo.</p>
    </section>
  );
}

function BatchSizeFields({ micro, steps, onChange }: {
  micro: number; steps: number; onChange: (micro: number, steps: number) => void;
}) {
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
      <label className="field-label">
        Global Batch Size
        <input className="field-input" type="number" min={1} max={16777216} step={1}
          value={globalDraft} aria-invalid={computed === null}
          onChange={(event) => change(event.target.value, microDraft)} onBlur={resetInvalid} />
      </label>
      <label className="field-label">
        Micro Batch Size
        <input className="field-input" type="number" min={1} max={4096} step={1}
          value={microDraft} aria-invalid={computed === null}
          onChange={(event) => change(globalDraft, event.target.value)} onBlur={resetInvalid} />
      </label>
      <label className="field-label">
        Accumulate Steps
        <input className="field-input !bg-gray-100 !text-gray-500 disabled:cursor-not-allowed dark:!bg-gray-800 dark:!text-gray-400"
          type="number" value={computed ?? ''} disabled readOnly />
      </label>
      {computed === null && <p className="field-help" role="alert">
        Enter positive integers: Global Batch Size must be a multiple of Micro Batch Size
        (up to 4096 micro samples and 4096 accumulation steps). Invalid edits reset on leaving the field.
      </p>}
    </div>
  );
}

function NumberField({ label, value, min, max, decimal = false, onChange }: {
  label: string; value: number; min: number; max: number; decimal?: boolean; onChange: (value: number) => void;
}) {
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
      {!valid && <span className="field-help">Enter {decimal ? 'a number' : 'an integer'} between {min} and {max}.</span>}
    </label>
  );
}
