import { NodeCard } from './NodeCard';
import { memo, useEffect } from 'react';
import { Handle, Position, useUpdateNodeInternals, type Node, type NodeProps } from '@xyflow/react';
import { AlertCircle, Check } from 'lucide-react';
import { tokenResources } from '@/utils/tokenResources';
import { useStudio } from '@/store/graphStore';
import { CATEGORY_COLORS, PORT_COLORS, fmt, iconFor, shortType } from '@/utils/ui';

export interface LegoNodeData extends Record<string, unknown> {
  nodeId: string;
  componentId: string;
}

export type LegoFlowNode = Node<LegoNodeData, 'lego'>;

const LegoNodeComponent = ({ data }: NodeProps<LegoFlowNode>) => {
  const updateNodeInternals = useUpdateNodeInternals();
  useEffect(() => updateNodeInternals(data.nodeId), [updateNodeInternals, data.nodeId, data.componentId]);
  const component = useStudio((s) => s.components[data.componentId]);
  const node = useStudio((s) => s.graph.nodes.find((n) => n.id === data.nodeId));
  const item = useStudio((s) => s.graph.nodes.find((candidate) => candidate.component.startsWith('item.')));
  const components = useStudio((s) => s.components);
  const issueState = useStudio((s) =>
    s.validation?.errors.some((e) => e.node_id === data.nodeId) ? 'error'
      : s.validation?.warnings.some((e) => e.node_id === data.nodeId && e.severity === 'warning') ? 'warning' : 'ok',
  );
  const hovered = useStudio((s) => s.hoveredNodeId === data.nodeId);

  if (!component || !node) {
    return <div className="lego-node p-3 text-xs">Unknown component: {data.componentId}</div>;
  }

  const color = CATEGORY_COLORS[component.category] || '#64748b';
  const Icon = iconFor(component.icon);
  const tokens = tokenResources(node, component, item, item ? components[item.component] : undefined);
  const summary = component.role === 'dataset' ? [
    { name: 'lm', value: tokens.lm },
    { name: 'token source', value: tokens.owner },
  ] : component.parameters
    .filter((p) => !p.advanced && !p.name.startsWith('inputer_config') && p.name !== 'data_config' && p.name !== 'embed_config')
    .slice(0, 3)
    .map((param) => ({ name: param.name, value: node.params[param.name] ?? param.default }));
  const missing = component.parameters.filter((p) => p.required && (node.params[p.name] === undefined || node.params[p.name] === ''));
  const configured = missing.length === 0;
  const hasError = issueState === 'error';

  return (
    <NodeCard title={node.label || component.name} category={component.category} color={color}
      icon={<Icon size={15} strokeWidth={2} />} className={`${hasError ? 'error' : ''} ${component.conceptual ? 'conceptual' : ''} ${hovered ? 'hovered' : ''}`}
      status={<>{hasError ? <AlertCircle size={13} className="text-red-500" /> : configured ? <Check size={12} className="text-emerald-500" /> : <AlertCircle size={12} className="text-amber-500" />}<span className={`status-dot ${hasError ? 'failed' : configured ? 'completed' : 'pending'}`} /></>}
      footer={
      <div className="grid grid-cols-2 gap-2 border-t border-line px-3 py-2 text-[9px]">
        <div className="space-y-1">
          {component.inputs.length === 0 && <span className="text-muted/60 italic">no inputs</span>}
          {component.inputs.map((port) => (
            <div key={port.name} className="relative port-label" title={`${port.name}: ${port.type}${port.required ? ' (required)' : ''}`}>
              <Handle
                type="target"
                position={Position.Left}
                id={port.name}
                className="lego-port-handle"
                title={port.name + ': ' + port.type}
              >
                <span className="lego-port-dot" style={{ background: PORT_COLORS[port.type] || color }} />
              </Handle>
              <span className="break-words">{shortType(port.type)}{port.required ? ' *' : ''}</span>
            </div>
          ))}
        </div>
        <div className="space-y-1">
          {component.outputs.length === 0 && <span className="text-muted/60 italic block text-right">no outputs</span>}
          {component.outputs.map((port) => (
            <div key={port.name} className="relative port-label justify-end" title={`${port.name}: ${port.type}`}>
              <span className="break-words text-right">{shortType(port.type)}</span>
              <Handle
                type="source"
                position={Position.Right}
                id={port.name}
                className="lego-port-handle"
                title={port.name + ': ' + port.type}
              >
                <span className="lego-port-dot" style={{ background: PORT_COLORS[port.type] || color }} />
              </Handle>
            </div>
          ))}
        </div>
      </div>

      }
    >
      <div className="px-3 py-2">
        <p className="text-[10px] leading-snug text-muted min-h-[26px]">{component.description}</p>
        {summary.length > 0 && (
          <div className="mt-2 space-y-0.5 rounded-md bg-black/[.025] dark:bg-white/[.035] px-2 py-1.5">
            {summary.map((param) => (
              <div key={param.name} data-param-name={param.name} className="flex items-center justify-between gap-2 items-start text-[9.5px]">
                <span className="text-muted break-words">{param.name.replace(/_/g, ' ')}</span>
                <span className="font-mono font-medium break-words" title={fmt(param.value)}>{fmt(param.value)}</span>
              </div>
            ))}
          </div>
        )}
        {component.conceptual && (
          <div className="mt-1.5 text-[9px] font-semibold text-amber-600 dark:text-amber-400">CONCEPTUAL · no YAML emitted</div>
        )}
      </div>

    </NodeCard>
  );
};

export const LegoNode = memo(LegoNodeComponent);
