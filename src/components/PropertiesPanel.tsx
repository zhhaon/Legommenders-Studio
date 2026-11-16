import { standardPropertyParameters } from '@/utils/propertyParameters';
import { categoryLabel, componentText, paramDescription, paramLabel } from '@/i18n/display';
import { text, tr, useLocale } from '@/i18n';
import { ResourceButton } from './ResourceButton';
import { DatasetInputs } from '@/components/DatasetInputs';
import { TrainingSettings } from '@/components/TrainingSettings';
import { useState } from 'react';
import {
  AlertCircle, CheckCircle2, Copy, GitBranch, Info, Plus, RotateCcw, Settings2, Trash2, Zap,
} from 'lucide-react';
import { useStudio } from '@/store/graphStore';
import type { ParamSpec } from '@/types/catalog';
import type { ParamValue } from '@/types/graph';
import { tokenResources } from '@/utils/tokenResources';
import { CATEGORY_COLORS, fmt, iconFor } from '@/utils/ui';

export function PropertiesPanel() {
  useLocale();
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

  const dataset = component?.role === 'dataset';
  const tokens = tokenResources(node, component, itemNode, itemSpec);
  const itemOwnsTokens = tokens.managedByItem;


  return (
    <aside aria-label={tr("ui.properties_panel_b9bd0a")} className="panel flex min-h-0 flex-col border-l">
      <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted">{tr("ui.properties_bc6c88")}</h2>
        <Settings2 size={13} className="text-muted" />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!node || !component ? (
          <div className="p-3">
            <div className="mb-3 rounded-lg border border-line bg-[var(--hover)] p-3">
              <p className="text-[11px] font-semibold">{tr("ui.no_node_selected_b102f5")}</p>
              <p className="mt-1 text-[10px] leading-relaxed text-muted"> {tr("ui.select_a_node_on_the_canvas_to_edit_its_real_configu_d5022b")} </p>
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
                {['dataset', 'item_encoder'].includes(component.category) && <ResourceButton component={component.id} params={node.params} />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-bold">{componentText(component, 'name')}</p>
                  <p className="text-[9.5px] uppercase tracking-wide text-muted">{categoryLabel(component.category)} · {component.id}</p>
                </div>
              </div>
              <p className="mt-2 text-[10px] leading-snug text-muted">{componentText(component, 'description')}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="badge">{text(component.status)}</span>
                <span className="badge">{component.inputs.length} {tr("ui.in__a7f713")} {component.outputs.length} {tr("ui.out_f4800d")}</span>
                {component.conceptual && <span className="badge text-amber-600">{tr("ui.conceptual_a2e9cc")}</span>}
              </div>
            </div>

            <div className="mb-3 flex flex-wrap gap-1">
              <button className="tool-btn outline !h-7 !px-2 !text-[10px]" onClick={() => setDialog('replace')} title={tr("ui.replace_this_component_with_a_compatible_one_79bc3e")}>
                <GitBranch size={12} /> {tr("ui.replace_a7cf7b")} </button>
              <button className="tool-btn outline !h-7 !px-2 !text-[10px]" onClick={() => setDialog('compatible')} title={tr("ui.add_a_compatible_component_aa3ebd")}>
                <Plus size={12} /> {tr("ui.compatible_65013e")} </button>
              <button className="tool-btn outline !h-7 !px-2 !text-[10px]" onClick={() => duplicateNode(node.id)}><Copy size={12} /> {tr("ui.copy_af74f7")}</button>
              <button className="tool-btn outline danger !h-7 !px-2 !text-[10px]" onClick={() => deleteNodes([node.id])}><Trash2 size={12} /> {tr("ui.delete_f6fdbe")}</button>
            </div>

            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted">{tr("ui.configuration_754164")}</h3>
              <button className="tool-btn !h-6 !px-1.5 !text-[9.5px]" onClick={() => resetParams(node.id)} title={tr("ui.restore_default_parameters_e4a271")}>
                <RotateCcw size={11} /> {tr("ui.defaults_428819")} </button>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="field-label">{tr("ui.component_name_28b2db")}</label>
                <input
                  className="field-input"
                  value={node.label || ''}
                  placeholder={componentText(component, 'name')}
                  onChange={(event) => setNodeLabel(node.id, event.target.value)}
                />
                <p className="field-help">{tr("ui.display_name_on_the_canvas_does_not_affect_the_compi_27fd21")}</p>
              </div>
              {dataset && itemOwnsTokens && (
                <div data-property-parameter="lm"><label className="field-label">{tr("ui.lm_aea416")}</label>
                  <input className="field-input" value={tokens.lm} readOnly />
                  <p className="field-help">{tr("ui.managed_by_item_encoder__b582df")} {componentText(itemSpec, 'name')}{tr("ui._tokenizer_and_embeddings_are_matched_automatically__d732d5")}</p>
                </div>
              )}
              {standardPropertyParameters(component, itemOwnsTokens)
                .map((param) => (
                  <div key={param.name} data-property-parameter={param.name}>
                    <ParamField
                      param={param}
                      value={(param.read_only || !(param.name in node.params) ? param.default : node.params[param.name]) as ParamValue}
                      onChange={(value) => updateParam(node.id, param.name, value)}
                    />
                  </div>
                ))}
              {component.role === 'dataset' && <DatasetInputs key={node.id} node={node} />}
              {component.parameters.length === 0 && (
                <p className="rounded-md border border-line bg-[var(--hover)] p-2 text-[10px] text-muted"> {tr("ui.this_component_has_no_user_editable_configuration_pa_4e4391")} </p>
              )}
            </div>

            <div className="mt-4 rounded-lg border border-line p-2.5">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">
                <Info size={11} /> {tr("ui.port_contract_86f481")} </div>
              {component.inputs.map((port) => (
                <p key={port.name} className="text-[9.5px] text-muted">{tr("ui.in__c846da")} {tr('portNames.' + port.name, {}, port.name)} : {tr('portTypes.' + port.type, {}, port.type)}{port.required ? tr("ui._required__9100e2") : ''}</p>
              ))}
              {component.outputs.map((port) => (
                <p key={port.name} className="text-[9.5px] text-muted">{tr("ui.out__433b37")} {tr('portNames.' + port.name, {}, port.name)} : {tr('portTypes.' + port.type, {}, port.type)}</p>
              ))}
            </div>


          </div>
        )}
      </div>

      <div className="border-t border-line p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted">{tr("ui.task_7bb0dd")}</h3>
          <span className={`badge ${graph.task === 'matching' ? 'text-blue-600' : 'text-purple-600'}`}>{graph.task === 'matching' ? tr("ui.matching_515055") : tr("ui.ranking_3937bb")}</span>
        </div>
        {environment && (
          <p className="mt-2 flex items-center gap-1 text-[9.5px] text-muted">
            <Zap size={10} /> torch {environment.torch} · {environment.cuda_available ? `${environment.cuda_device_count} GPU` : tr("ui.cpu_only_209f23")}
          </p>
        )}
        {validation && (
          <p className={`mt-1.5 flex items-center gap-1 text-[9.5px] ${validation.valid ? 'text-emerald-600' : 'text-red-600'}`}>
            {validation.valid ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
            {validation.valid ? tr("ui.model_graph_is_valid_75a2e4") : tr("messages.03aee3754549", { p0: validation.errors.length })}
          </p>
        )}
      </div>
    </aside>
  );
}

function ProjectSettings() {
  useLocale();
  const graph = useStudio((state) => state.graph);
  return (
    <div className="space-y-2.5">
      <TrainingSettings />
      <p className="field-help">
        {graph.nodes.length} {tr("ui.nodes__25d85b")} {graph.edges.length} {tr("ui.edges__8df36c")} {text(graph.task)} {tr("ui.task_select_a_node_to_edit_its_module_specific_param_0efcf6")} </p>
    </div>
  );
}

function ParamField({ param, value, onChange }: {
  param: ParamSpec; value: ParamValue; onChange: (value: ParamValue) => void;
}) {
  useLocale();
  const label = paramLabel(param.name);
  const range = param.minimum != null || param.maximum != null ? tr('parameter.range', { min: param.minimum ?? '-∞', max: param.maximum ?? '∞' }) : '';
  const hint = tr('parameter.hint', { description: paramDescription(param) + range, value: param.default_hint ?? fmt(param.default) });

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
          {(param.choices.length ? param.choices : [String(value ?? '')]).map((choice) => <option key={choice} value={choice}>{text(choice)}</option>)}
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
  useLocale();
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
      <span className="field-help">{invalid ? tr("ui.enter_valid_json__fa534b") : hint}</span>
    </label>
  );
}
