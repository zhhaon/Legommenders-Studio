import { DatasetInputs } from '@/components/DatasetInputs';
import { TrainingSettings } from '@/components/TrainingSettings';
import { useMemo, useState } from 'react';
import {
  AlertCircle, CheckCircle2, Copy, GitBranch, Info, Plus, RotateCcw, Settings2, Trash2, Zap,
} from 'lucide-react';
import { useStudio } from '@/store/graphStore';
import type { ParamSpec } from '@/types/catalog';
import type { ParamValue } from '@/types/graph';
import { tokenResources } from '@/utils/tokenResources';
import { CATEGORY_COLORS, fmt, iconFor } from '@/utils/ui';

export function PropertiesPanel() {
  const selectedNodeId = useStudio((s) => s.selectedNodeId);
  const node = useStudio((s) => s.graph.nodes.find((n) => n.id === s.selectedNodeId) || null);
  const component = useStudio((s) => (node ? s.components[node.component] : undefined));
  const itemSpec = useStudio((s) => s.components[s.graph.nodes.find((n) => n.component.startsWith('item.'))?.component || '']);
  const itemNode = useStudio((s) => s.graph.nodes.find((n) => n.component.startsWith('item.')));
  const validation = useStudio((s) => s.validation);
  const graph = useStudio((s) => s.graph);
  const environment = useStudio((s) => s.environment);
  const updateParam = useStudio((s) => s.updateParam);
  const setNodeLabel = useStudio((s) => s.setNodeLabel);
  const resetParams = useStudio((s) => s.resetParams);
  const duplicateNode = useStudio((s) => s.duplicateNode);
  const deleteNodes = useStudio((s) => s.deleteNodes);
  const setDialog = useStudio((s) => s.setDialog);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const nodeIssues = useMemo(() =>
    [...(validation?.errors || []), ...(validation?.warnings || []), ...(validation?.runtime_checks || [])]
      .filter((i) => i.node_id === selectedNodeId),
    [validation, selectedNodeId]);

  const dataset = component?.role === 'dataset';
  const tokens = tokenResources(node, component, itemNode, itemSpec);
  const itemOwnsTokens = tokens.managedByItem;
  const tokenFieldVisible = (name: string) => {
    if (!dataset) return true;
    if (['token_source', 'data_config', 'embed_config'].includes(name) || name.startsWith('external_')) return false;
    if (name === 'lm') return !itemOwnsTokens;
    return true;
  };

  return (
    <aside aria-label="Properties Panel" className="panel flex min-h-0 flex-col border-l">
      <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted">Properties</h2>
        <Settings2 size={13} className="text-muted" />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!node || !component ? (
          <div className="p-3">
            <div className="mb-3 rounded-lg border border-line bg-[var(--hover)] p-3">
              <p className="text-[11px] font-semibold">No node selected</p>
              <p className="mt-1 text-[10px] leading-relaxed text-muted">
                Select a node on the canvas to edit its real configuration parameters, or edit the run settings below.
              </p>
            </div>
            <ProjectSettings />
          </div>
        ) : (
          <div className="p-3">
            <div className="mb-3 rounded-lg border border-line p-2.5" style={{ borderTop: `3px solid ${CATEGORY_COLORS[component.category]}` }}>
              <div className="flex items-start gap-2">
                <div className="icon-tile" style={{ background: CATEGORY_COLORS[component.category] }}>
                  {(() => { const Icon = iconFor(component.icon); return <Icon size={15} />; })()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-bold">{component.name}</p>
                  <p className="text-[9.5px] uppercase tracking-wide text-muted">{component.category.replace(/_/g, ' ')} · {component.id}</p>
                </div>
              </div>
              <p className="mt-2 text-[10px] leading-snug text-muted">{component.description}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="badge">{component.status}</span>
                <span className="badge">{component.inputs.length} in / {component.outputs.length} out</span>
                {component.conceptual && <span className="badge text-amber-600">conceptual</span>}
              </div>
            </div>

            <div className="mb-3 flex flex-wrap gap-1">
              <button className="tool-btn outline !h-7 !px-2 !text-[10px]" onClick={() => setDialog('replace')} title="Replace this component with a compatible one">
                <GitBranch size={12} /> Replace
              </button>
              <button className="tool-btn outline !h-7 !px-2 !text-[10px]" onClick={() => setDialog('compatible')} title="Add a compatible component">
                <Plus size={12} /> Compatible
              </button>
              <button className="tool-btn outline !h-7 !px-2 !text-[10px]" onClick={() => duplicateNode(node.id)}><Copy size={12} /> Copy</button>
              <button className="tool-btn outline danger !h-7 !px-2 !text-[10px]" onClick={() => deleteNodes([node.id])}><Trash2 size={12} /> Delete</button>
            </div>

            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted">Configuration</h3>
              <button className="tool-btn !h-6 !px-1.5 !text-[9.5px]" onClick={() => resetParams(node.id)} title="Restore default parameters">
                <RotateCcw size={11} /> Defaults
              </button>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="field-label">Component Name</label>
                <input
                  className="field-input"
                  value={node.label || ''}
                  placeholder={component.name}
                  onChange={(event) => setNodeLabel(node.id, event.target.value)}
                />
                <p className="field-help">Display name on the canvas. Does not affect the compiled YAML.</p>
              </div>
              {dataset && itemOwnsTokens && (
                <div><label className="field-label">Lm</label>
                  <input className="field-input" value={tokens.lm} readOnly />
                  <p className="field-help">Managed by Item Encoder · {itemSpec?.name}. Tokenizer and embeddings are matched automatically.</p>
                </div>
              )}
              {component.parameters
                .filter((param) => param.name !== 'item_inputs' && tokenFieldVisible(param.name) && (showAdvanced || !param.advanced))
                .map((param) => (
                  <ParamField
                    key={param.name}
                    param={param}
                    value={(param.read_only || !(param.name in node.params) ? param.default : node.params[param.name]) as ParamValue}
                    onChange={(value) => updateParam(node.id, param.name, value)}
                  />
                ))}
              {component.role === 'dataset' && <DatasetInputs key={node.id} node={node} />}
              {component.parameters.length === 0 && (
                <p className="rounded-md border border-line bg-[var(--hover)] p-2 text-[10px] text-muted">
                  This component has no user-editable configuration parameters.
                </p>
              )}
              <button className="tool-btn !h-6 w-full justify-center !text-[10px]" onClick={() => setShowAdvanced(!showAdvanced)}>
                {showAdvanced ? 'Hide' : 'Show'} advanced parameters ({component.parameters.filter((p) => p.advanced).length})
              </button>
            </div>

            <div className="mt-4 rounded-lg border border-line p-2.5">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">
                <Info size={11} /> Port contract
              </div>
              {component.inputs.map((port) => (
                <p key={port.name} className="text-[9.5px] text-muted">IN · {port.name} : {port.type}{port.required ? ' (required)' : ''}</p>
              ))}
              {component.outputs.map((port) => (
                <p key={port.name} className="text-[9.5px] text-muted">OUT · {port.name} : {port.type}</p>
              ))}
            </div>

            {nodeIssues.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted">Issues for this node</h3>
                {nodeIssues.map((issue, index) => (
                  <div key={index} className={`rounded-md border p-2 text-[10px] ${issue.severity === 'error' ? 'border-red-200 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300' : 'border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'}`}>
                    <p className="font-semibold">{issue.message}</p>
                    {issue.fix && <p className="mt-1 opacity-80">Fix: {issue.fix}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-line p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted">Task</h3>
          <span className={`badge ${graph.task === 'matching' ? 'text-blue-600' : 'text-purple-600'}`}>{graph.task === 'matching' ? 'Matching' : 'Ranking'}</span>
        </div>
        {environment && (
          <p className="mt-2 flex items-center gap-1 text-[9.5px] text-muted">
            <Zap size={10} /> torch {environment.torch} · {environment.cuda_available ? `${environment.cuda_device_count} GPU` : 'CPU only'}
          </p>
        )}
        {validation && (
          <p className={`mt-1.5 flex items-center gap-1 text-[9.5px] ${validation.valid ? 'text-emerald-600' : 'text-red-600'}`}>
            {validation.valid ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
            {validation.valid ? 'Model Graph is Valid' : `${validation.errors.length} validation error(s)`}
          </p>
        )}
      </div>
    </aside>
  );
}

function ProjectSettings() {
  const graph = useStudio((state) => state.graph);
  return (
    <div className="space-y-2.5">
      <TrainingSettings />
      <p className="field-help">
        {graph.nodes.length} nodes · {graph.edges.length} edges · {graph.task} task.
        Select a node to edit its module-specific parameters.
      </p>
    </div>
  );
}

function ParamField({ param, value, onChange }: {
  param: ParamSpec; value: ParamValue; onChange: (value: ParamValue) => void;
}) {
  const label = param.name.replace(/^external_/, '').replace(/_/g, ' ');
  const hint = `${param.description}${param.minimum !== null || param.maximum !== null ? ` Range ${param.minimum ?? '-∞'} – ${param.maximum ?? '∞'}.` : ''} Default: ${param.default_hint ?? fmt(param.default)}.`;

  if (param.type === 'boolean') {
    return (
      <div>
        <div className="flex items-center justify-between rounded-md border border-line px-2.5 py-1.5">
          <span className="field-label !mb-0 capitalize">{label}{param.required && ' *'}</span>
          <button
            role="switch" aria-checked={Boolean(value)}
            className={`relative h-[18px] w-8 rounded-full transition-colors ${value ? 'bg-blue-600' : 'bg-slate-300'}`}
            onClick={() => onChange(!value)}
          >
            <span className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white transition-all ${value ? 'left-[16px]' : 'left-[2px]'}`} />
          </button>
        </div>
        <p className="field-help">{hint}</p>
      </div>
    );
  }

  if (param.type === 'enum') {
    return (
      <div>
        <label className="field-label capitalize">{label}{param.required && ' *'}</label>
        <select className="field-input" aria-label={label} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
          {(param.choices.length ? param.choices : [String(value ?? '')]).map((choice) => <option key={choice} value={choice}>{choice}</option>)}
        </select>
        <p className="field-help">{hint}</p>
      </div>
    );
  }

  if (param.type === 'integer' || param.type === 'number') {
    return (
      <div>
        <label className="field-label capitalize">{label}{param.required && ' *'}</label>
        <input
          type="number" className="field-input"
          readOnly={param.read_only} aria-label={label}
          value={value === null || value === undefined ? '' : String(value)}
          min={param.minimum ?? undefined} max={param.maximum ?? undefined}
          step={param.type === 'integer' ? 1 : 'any'}
          onChange={(event) => {
            const raw = event.target.value;
            if (raw === '') { onChange(null); return; }
            const parsed = Number(raw);
            if (Number.isFinite(parsed)) onChange(parsed);
          }}
        />
        <p className="field-help">{hint}</p>
      </div>
    );
  }

  if (['list', 'object', 'number_or_list', 'string_or_list'].includes(param.type)) {
    return <StructuredParamField param={param} value={value} onChange={onChange} label={label} hint={hint} />;
  }

  return (
    <div>
      <label className="field-label capitalize">{label}{param.required && ' *'}</label>
      <input className="field-input" aria-label={label} value={value === null || value === undefined ? '' : String(value)}
        onChange={(event) => onChange(event.target.value || (param.nullable ? null : ''))} />
      <p className="field-help">{hint}</p>
    </div>
  );
}


function StructuredParamField({ param, value, onChange, label, hint }: {
  param: ParamSpec; value: ParamValue; onChange: (value: ParamValue) => void; label: string; hint: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  return (
    <label className="field-label">
      {label}{param.required && ' *'}
      <input className="field-input font-mono" value={draft ?? (value == null ? '' : JSON.stringify(value))}
        aria-invalid={invalid}
        onChange={(event) => {
          const text = event.target.value;
          setDraft(text);
          try {
            const parsed = !text.trim() ? null : param.type === 'string_or_list'
              && !/^[\["]/.test(text.trim()) && text.trim() !== 'null' ? text.trim() : JSON.parse(text);
            onChange(parsed as ParamValue);
            setInvalid(false);
          } catch {
            setInvalid(true);
          }
        }}
        onBlur={() => { setDraft(null); setInvalid(false); }} />
      <span className="field-help">{invalid ? 'Enter valid JSON.' : hint}</span>
    </label>
  );
}
