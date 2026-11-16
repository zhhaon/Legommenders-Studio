import { tr, useLocale } from '@/i18n';
import { componentText, detailText, paramLabel } from '@/i18n/display';
import { FlowValue } from './FlowValue';
import { DatasetProperties } from './DatasetProperties';
import { useStudio } from '@/store/graphStore';
import { CATEGORY_COLORS, fmt, iconFor } from '@/utils/ui';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Boxes, Layers3, Database, Sigma, UserRound, ScanLine, Target, Check } from 'lucide-react';
import { tokenResources } from '@/utils/tokenResources';
import { NodeCard } from '@/nodes/NodeCard';
import type { DetailNode as DetailFlowNode } from './detailedGraph';

export function DetailNode({ data }: NodeProps<DetailFlowNode>) {
  useLocale();
  const original = useStudio(s=>s.graph.nodes.find(n=>n.id===data.originalId));
  const spec = useStudio(s=>s.components[original?.component || '']);
  const item = useStudio(s=>s.graph.nodes.find(n=>n.component.startsWith('item.')));
  const itemSpec = useStudio(s=>s.components[item?.component || '']);
  if (data.kind) return <div style={{ width: data.kind === 'heading' ? 600 : Number(data.ellipsisWidth ?? 228), color: data.color }} className={data.kind === 'ellipsis' ? 'text-center text-2xl leading-none' : 'text-base font-semibold tracking-tight'}>{detailText(data.title)}<div className="mt-1 text-[11px] text-muted font-normal tracking-normal">{detailText(data.subtitle)}</div></div>;
  if (data.valueKind) return <FlowValue data={data} />;
  const DefaultIcon = data.title.includes('Task') ? Target : data.title.includes('Encoder') ? Layers3 : data.title.includes('Embedding') ? Boxes : data.title === 'Predictor' ? Sigma : data.title === 'Score' ? ScanLine : data.title.includes('User') ? UserRound : Database;
  const category = data.title.includes('Encoder') ? data.title : data.title.includes('Task') ? 'training' : data.title.includes('Embedding') ? 'representation' : data.title === 'Predictor' ? 'predictor' : 'data';
  const Icon = spec ? iconFor(spec.icon) : DefaultIcon;
  const preserved = ['dataset', 'item_encoder', 'user_encoder', 'predictor', 'training'].includes(spec?.category || '');
  const readOnly = !original && !data.datasetProxy;
  const tokens = tokenResources(original, spec, item, itemSpec);
  const parameters = spec?.parameters.filter(param => {
    if (param.read_only || param.advanced) return false;
    if (spec.role !== 'dataset') return true;
    if (['lm', 'item_inputs'].includes(param.name)) return false;
    if (['token_source', 'data_config', 'embed_config'].includes(param.name) || param.name.startsWith('external_')) return false;
    return param.name !== 'lm' || !tokens.managedByItem;
  }) || [];
  const configuration = preserved && original && spec;

  return <NodeCard compact={data.datasetProxy} className={readOnly ? 'data-flow-readonly' : ''} title={data.datasetProxy ? detailText(data.title) : original?.label || (preserved ? componentText(spec, 'name') : undefined) || detailText(data.title)} category={spec?.category || (data.datasetProxy ? 'dataset' : category)} color={data.datasetProxy ? CATEGORY_COLORS.dataset : readOnly ? '#64748b' : spec ? CATEGORY_COLORS[spec.category] : data.color} icon={<Icon size={15} strokeWidth={2}/>} status={data.originalId ? <Check size={12} className="text-emerald-500"/> : undefined} footer={
    <div className="border-t border-line px-3 py-2 flex justify-between text-[9px] text-muted">
      <span>{data.title.includes('Predictor') ? tr('ui.user_candidate_bb2eac') : tr('ui.input_140f86')}</span><span>{data.title.includes('Task') ? tr('ui.objective_d2dc87') : tr('ui.output_1029d6')}</span>
    </div>
  }>
    <Handle type="target" position={Position.Left} id="in" isConnectable={false} style={{ visibility: 'hidden' }} />
    <Handle type="target" position={Position.Left} id="item" isConnectable={false} style={{ visibility: 'hidden' }} />
    <Handle type="target" position={Position.Left} id="user" style={{ top: '25%', visibility: 'hidden' }} isConnectable={false} />
    {data.datasetProxy && <div className="mb-2 break-words text-[10px] font-semibold" title={original?.label || componentText(spec, 'name')}>
      {original ? (original.label || componentText(spec, 'name') || original.component) : data.subtitle}
    </div>}
    {configuration ? <>
      {/* Keep connection handles while displaying editable configuration instead of port contracts. */}
      {spec.inputs.map((port, index) => <Handle key={`in:${port.name}`} type="target" position={Position.Left}
        id={`port:${port.name}`} style={{ top: `${(index + 1) * 100 / (spec.inputs.length + 1)}%` }} />)}
      {spec.outputs.map((port, index) => <Handle key={`out:${port.name}`} type="source" position={Position.Right}
        id={`port:${port.name}`} style={{ top: `${(index + 1) * 100 / (spec.outputs.length + 1)}%` }} />)}
      <div className="nowheel max-h-60 overflow-y-auto space-y-1" aria-label={tr("ui.configurable_properties_a0baa4")}>
        {spec.role === 'dataset' && <div data-param-name="lm" className="flex items-start justify-between gap-2 text-[9.5px]">
          <span>{tr("ui.lm_aea416")}</span><span className="min-w-0 break-words text-right font-mono font-medium" title={tokens.lm}>{tokens.lm}</span>
        </div>}
        {parameters.map(param => {
          const value = param.name in original.params ? original.params[param.name] : param.default;
          const display = value !== null && typeof value === 'object' ? JSON.stringify(value) : fmt(value);
          return <div key={param.name} data-param-name={param.name} className="flex items-start justify-between gap-2 text-[9.5px]">
            <span className="min-w-0 flex-1 break-words capitalize">{paramLabel(param.name)}</span>
            <span className="min-w-0 flex-1 break-words text-right font-mono font-medium text-[var(--text)]" title={display}>{display}</span>
          </div>;
        })}
        {spec.role === 'dataset' && <DatasetProperties node={original} itemComponent={item?.component} />}
        {!parameters.length && spec.role !== 'dataset' && <p>{tr("ui.no_user_editable_configuration_parameters__3d21be")}</p>}
      </div>
    </> : <>
      {spec && <div className="mb-2 space-y-1 text-[9px]">
        {spec.inputs.map(port => <div key={`in:${port.name}`} className="relative text-left">
          <Handle type="target" position={Position.Left} id={`port:${port.name}`} style={{ left: -12, top: '50%' }} />
          {port.name}{port.required ? ' *' : ''} · {port.type}
        </div>)}
        {spec.outputs.map(port => <div key={`out:${port.name}`} className="relative text-right">
          {port.name} · {port.type}
          <Handle type="source" position={Position.Right} id={`port:${port.name}`} style={{ right: -12, top: '50%' }} />
        </div>)}
      </div>}
      {!data.datasetProxy && (detailText(data.subtitle) || (data.originalId ? tr("ui.click_to_configure_a4b1d7") : data.title.includes('Embedding') ? tr("ui.latent_representation_3516f5") : data.title === 'Score' ? tr("ui.predicted_relevance_7eff92") : tr("ui.item_content_cc064f")))}
    </>}
    <Handle type="source" position={Position.Right} id="out" isConnectable={false} style={{ visibility: 'hidden' }} />
  </NodeCard>;
}
