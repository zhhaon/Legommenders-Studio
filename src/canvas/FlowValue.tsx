import { tr, useLocale } from '@/i18n';
import { exampleItemVector } from './exampleVector';
import { Handle, Position } from '@xyflow/react';
import { useStudio } from '@/store/graphStore';
import { useDatasetPreview } from '@/hooks/useDatasetPreview';
import { CATEGORY_COLORS, hexAlpha } from '@/utils/ui';
import type { DatasetInput, GraphNode } from '@/types/graph';
import type { DetailData } from './detailedGraph';
import { vectorDimension } from './vectorDimension';

export function FlowValue({ data }: { data: DetailData }) {
  useLocale();
  const graph = useStudio(s => s.graph);
  const specs = useStudio(s => s.components);
  const item = graph.nodes.find(n => n.id === data.dimensionSourceId);
  const datasetId = item && graph.edges.find(e => e.target === item.id && e.targetHandle === 'content')?.source;
  const dataset = graph.nodes.find(n => n.id === datasetId);
  if (dataset) return <ResolvedValue data={data} dataset={dataset} item={item} />;
  const dimension = vectorDimension(graph, item, item && specs[item.component], graph.train.item_hidden_size ?? graph.train.hidden_size);
  return <ValueShape data={data} itemDimension={dimension} />;
}
function ResolvedValue({ data, dataset, item }: { data: DetailData; dataset: GraphNode; item?: GraphNode }) {
  useLocale();
  const graph = useStudio(s => s.graph);
  const specs = useStudio(s => s.components);
  const preview = useDatasetPreview(dataset, item?.component);
  const columns = (dataset.params.item_inputs as DatasetInput[] | null | undefined) ?? preview?.preview?.defaults;
  const dimension = vectorDimension(graph, item, item && specs[item.component], graph.train.item_hidden_size ?? graph.train.hidden_size, columns?.length);
  return <ValueShape data={data} itemDimension={dimension} />;
}
function ValueShape({ data, itemDimension }: { data: DetailData; itemDimension: number | null }) {
  useLocale();
  const graph = useStudio(s => s.graph);
  const specs = useStudio(s => s.components);
  const user = graph.nodes.find(n => n.id === data.userSourceId);
  const isUser = data.valueKind === 'user-vector';
  const score = data.valueKind === 'score';
  const dim = isUser ? vectorDimension(graph, user, user && specs[user.component], itemDimension) : itemDimension;
  const color = CATEGORY_COLORS[score ? 'predictor' : isUser ? 'user_encoder' : 'item_encoder'];
  const values = isUser ? ['0.24', '0.16', '−0.09', '0.18'] : exampleItemVector(String(data.exampleKey || 'h1'));
  const formatted = values.map(value => {
    const rounded = Number(Number(value.replace('−', '-')).toFixed(2));
    return rounded.toFixed(2).replace('-', '−');
  });
  const vector = dim && dim <= 4 ? formatted.slice(0, dim) : [...formatted.slice(0, 3), '⋮', formatted[3]];
  return <div className="flow-value" style={{ color, width: score ? 'max-content' : 76 }} title={tr("ui.fixed_example_values_dimensions_follow_model_configu_1b59ed")}>
    <Handle type="target" position={Position.Left} id="in" isConnectable={false} style={{ visibility: 'hidden' }} />
    {score ? <div className={`rounded-lg border px-3 py-2 text-center font-mono ${data.positiveScore ? 'border-b-4 shadow-sm' : ''}`}
      style={{ borderColor: hexAlpha(color, .45), background: hexAlpha(color, .08), fontSize: 17 }}>
      {data.exampleScore}
    </div> : <div className="relative mx-auto w-[76px] rounded-lg border px-3 py-2 text-center font-mono text-[12px]" style={{ borderColor: hexAlpha(color, .45), background: hexAlpha(color, .08) }} aria-label={tr("ui.column_vector_da5b03")}>
      <span aria-hidden="true" className="absolute bottom-2 left-1 top-2 w-1.5 border-y border-l" style={{ borderColor: color }} />
      <div className="flex flex-col gap-1">{vector.map((value, index) => <span key={index}>{value}</span>)}</div>
      <span aria-hidden="true" className="absolute bottom-2 right-1 top-2 w-1.5 border-y border-r" style={{ borderColor: color }} />
    </div>}
    <div className="relative left-1/2 mt-1 w-max -translate-x-1/2 whitespace-nowrap text-center text-[10px]">{score ? tr("ui.score_489f48") : <>
      <div>{tr(isUser ? 'canvas.userEmbedding' : 'canvas.itemEmbedding')}</div>
      <div>{dim ? tr('canvas.dimensions', { count: dim }) : tr("ui.dimension_unknown_5cd474")}</div>
    </>}</div>
    <Handle type="source" position={Position.Right} id="out" isConnectable={false} style={{ visibility: 'hidden' }} />
  </div>;
}
