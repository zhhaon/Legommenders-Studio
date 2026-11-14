import { useStudio } from '@/store/graphStore';
import { CATEGORY_COLORS, iconFor } from '@/utils/ui';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Boxes, Layers3, Database, Sigma, UserRound, ScanLine, Target, Check } from 'lucide-react';
import { NodeCard } from '@/nodes/NodeCard';
import type { DetailNode as DetailFlowNode } from './detailedGraph';

export function DetailNode({ data }: NodeProps<DetailFlowNode>) {
  const original = useStudio(s=>s.graph.nodes.find(n=>n.id===data.originalId));
  const spec = useStudio(s=>s.components[original?.component || '']);
  if (data.kind) return <div style={{ width: data.kind === 'heading' ? 600 : 228, color: data.color }} className={data.kind === 'ellipsis' ? 'text-center text-2xl leading-none' : 'text-base font-semibold tracking-tight'}>{data.title}<div className="mt-1 text-[11px] text-muted font-normal tracking-normal">{data.subtitle}</div></div>;
  const DefaultIcon = data.title.includes('Task') ? Target : data.title.includes('Encoder') ? Layers3 : data.title.includes('Embedding') ? Boxes : data.title === 'Predictor' ? Sigma : data.title === 'Score' ? ScanLine : data.title.includes('User') ? UserRound : Database;
  const category = data.title.includes('Encoder') ? data.title : data.title.includes('Task') ? 'training' : data.title.includes('Embedding') ? 'representation' : data.title === 'Predictor' ? 'predictor' : 'data';
  const Icon = spec ? iconFor(spec.icon) : DefaultIcon;
  return <NodeCard title={original?.label || data.title} category={spec?.category || category} color={spec ? CATEGORY_COLORS[spec.category] : data.color} icon={<Icon size={15} strokeWidth={2}/>} status={data.originalId ? <Check size={12} className="text-emerald-500"/> : undefined} footer={
    <div className="border-t border-line px-3 py-2 flex justify-between text-[9px] text-muted">
      <span>{data.title.includes('Predictor') ? 'user + candidate' : 'input'}</span><span>{data.title.includes('Task') ? 'objective' : 'output'}</span>
    </div>
  }>
    <Handle type="target" position={Position.Left} id="in" isConnectable={false} />
    <Handle type="target" position={Position.Left} id="item" isConnectable={false} />
    <Handle type="target" position={Position.Left} id="user" style={{ top: '25%' }} isConnectable={false} />
    {data.subtitle || (data.originalId ? 'Click to configure' : data.title.includes('Embedding') ? 'Latent representation' : data.title === 'Score' ? 'Predicted relevance' : 'Item content')}
    <Handle type="source" position={Position.Right} id="out" isConnectable={false} />
  </NodeCard>;
}
