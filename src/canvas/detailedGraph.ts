import { CATEGORY_COLORS } from '@/utils/ui';
import { MarkerType, type Connection, type Edge, type Node } from '@xyflow/react';
import type { GraphJson, GraphNode, GraphEdge } from '@/types/graph';
import type { ComponentSpec } from '@/types/catalog';
export type DetailData = Record<string, unknown> & { title: string; subtitle?: string; originalId?: string; color: string; kind?: string; datasetProxy?: boolean; valueKind?: 'item-vector' | 'user-vector' | 'score'; dimensionSourceId?: string; userSourceId?: string; positiveScore?: boolean; exampleScore?: string };
export type DetailNode = Node<DetailData, 'detail'>;
export function detailConnection(c: Connection, nodes: DetailNode[]): Connection | null {
  const source = nodes.find(n => n.id === c.source)?.data.originalId;
  const target = nodes.find(n => n.id === c.target)?.data.originalId;
  if (!source || !target || !c.sourceHandle?.startsWith('port:') || !c.targetHandle?.startsWith('port:')) return null;
  return { source, target, sourceHandle: c.sourceHandle.slice(5), targetHandle: c.targetHandle.slice(5) };
}
/** Select one visual instance while retaining the shared configuration selection. */
export function selectedDetailInstanceId(nodes: DetailNode[], originalId: string | null, instanceId: string | null): string | null {
  if (!originalId) return null;
  const clicked = nodes.find(node => node.id === instanceId && node.data.originalId === originalId);
  return clicked?.id ?? nodes.find(node => node.data.originalId === originalId)?.id ?? null;
}
/** A projected connection can repeat one configuration edge; highlight one instance only. */
export function selectedDetailEdgeInstanceId(edges: Edge[], originalId: string | null, instanceId: string | null): string | null {
  if (!originalId) return null;
  const clicked = edges.find(edge => edge.id === instanceId && edge.data?.originalEdgeId === originalId);
  return clicked?.id ?? edges.find(edge => edge.data?.originalEdgeId === originalId)?.id ?? null;
}
/** Expanded projection. Every cross-module path is backed by a real edge. */
export function detailedGraph(graph: GraphJson, specs: Record<string, ComponentSpec>) {
  if (!graph.nodes.length) return null;
  const nodes: DetailNode[] = [], edges: Edge[] = [];
  const category = (n: GraphNode) => specs[n.component]?.role || specs[n.component]?.category;
  const first = (role: string) => graph.nodes.find(n => category(n) === role);
  const user = first('user_encoder'), predictor = first('predictor'), task = first('training');
  const representative = new Map<string, string>(), aliases = new Map<string, string[]>();
  const handled = new Set<string>();
  const add = (id: string, title: string, x: number, y: number, color: string, original?: GraphNode, subtitle?: string, kind?: string) => {
    const connected = original && graph.edges.some(e => e.source === original.id || e.target === original.id);
    nodes.push({ id, type: 'detail', position: { x, y }, data: { title, color, originalId: original?.id,
      subtitle: original && !connected ? `Disconnected · ${subtitle || 'Connect ports to use this component'}` : subtitle, kind }, draggable: true, connectable: Boolean(original) });
    if (original) {
      if (!representative.has(original.id)) representative.set(original.id, id);
      aliases.set(original.id, [...(aliases.get(original.id) || []), id]);
    }
    return id;
  };
  const link = (source: string, target: string, edge?: GraphEdge, targetHandle = 'in') => {
    const color = nodes.find(n => n.id === source)?.data.color || '#8b9db5';
    edges.push({ id: `${source}->${target}:${edges.length}`, source, target, sourceHandle: 'out', targetHandle,
      type: 'detail', data: { originalEdgeId: edge?.id, relation: edge ? `${edge.sourceHandle} → ${edge.targetHandle}` : undefined, userBus: graph.task === 'matching' && source === 'user:embedding' },
      selectable: Boolean(edge), style: { stroke: color, strokeWidth: 1.8 },
      markerEnd: { type: MarkerType.ArrowClosed, color } });
    if (edge) handled.add(edge.id);
  };
  if (user && predictor && task) {
    const matching = graph.task === 'matching';
    const rawCount = Number(task.params.neg_count ?? specs[task.component]?.parameters.find(p => p.name === 'neg_count')?.default ?? 4);
    const count = Number.isFinite(rawCount) ? Math.max(0, Math.floor(rawCount)) : 4;
    const u = add('user:encoder', 'User Encoder', 770, 125, CATEGORY_COLORS.user_encoder, user, 'Click to configure');
    const ue = add('user:embedding', 'User Embedding', 1010, 125, CATEGORY_COLORS.user_encoder);
    Object.assign(nodes[nodes.length - 1].data, { valueKind: 'user-vector', userSourceId: user.id, dimensionSourceId: graph.edges.find(e => e.target === user.id && e.targetHandle === 'history')?.source });
    link(u, ue);
    const objective = add('objective', matching ? 'Matching Task' : 'Ranking Task', 1540, matching && count > 0 ? 675 : 540, '#f59e0b', task,
      matching ? `${count + 1} scores · cross entropy` : 'Score + label · binary cross entropy');
    const branches = [{ key: 'positive', title: matching ? 'Positive Candidate' : 'Candidate', y: 540 }];
    if (matching && count > 0) branches.push({ key: 'negative1', title: 'Negative Candidate 1', y: 675 });
    if (matching && count > 1) branches.push({ key: 'negativeN', title: `Negative Candidate ${count}`, y: count > 2 ? 860 : 810 });
    const incoming = (target: string, handles: string[]) => graph.edges.filter(e => e.target === target && handles.includes(e.targetHandle));
    const sourceNode = (e: GraphEdge) => graph.nodes.find(n => n.id === e.source);
    const encode = (prefix: string, title: string, y: number, e: GraphEdge, offset: number) => {
      const source = sourceNode(e)!;
      const item = category(source) === 'item_encoder';
      const datasets = item ? incoming(source.id, ['content']).map(sourceNode).filter((n): n is GraphNode => Boolean(n && category(n) === 'dataset')) : category(source) === 'dataset' ? [source] : [];
      const unique = [...new Map(datasets.map(n => [n.id, n])).values()];
      const dataset = unique.length === 1 ? unique[0] : undefined;
      const input = add(`${prefix}:item`, title, 40, y + offset, '#3b82f6', dataset,
        dataset ? undefined : unique.length > 1 ? 'Multiple datasets connected' : 'Dataset not connected');
      nodes[nodes.length - 1].data.datasetProxy = true;
      let end = input;
      if (item) {
        end = add(`${prefix}:encoder`, 'Item Encoder', 270, y + offset, CATEGORY_COLORS.item_encoder, source, incoming(source.id, ['content']).length ? 'Shared weights' : 'Shared weights · missing content input');
        incoming(source.id, ['content']).forEach(content => {
          const origin = sourceNode(content);
          if (origin && category(origin) === 'dataset') link(input, end, content);
        });
      }
      const embedding = add(`${prefix}:embedding`, 'Item Embedding', 510, y + offset, CATEGORY_COLORS.item_encoder, undefined,
        item ? 'Encoded item representation' : 'Dataset / ID representation');
      Object.assign(nodes[nodes.length - 1].data, { valueKind: 'item-vector', dimensionSourceId: item ? source.id : undefined, exampleKey: prefix });
      link(end, embedding, item ? undefined : e);
      return embedding;
    };
    const expandable = (e: GraphEdge) => {
      const s = sourceNode(e);
      if (!s) return false;
      return category(s) === 'item_encoder'
        ? (e.sourceHandle === 'history' && e.targetHandle === 'history') || (e.sourceHandle === 'candidate' && e.targetHandle === 'candidate')
        : category(s) === 'dataset' && ((e.sourceHandle === 'history' && e.targetHandle === 'history') || (e.sourceHandle === 'features' && ['features', 'candidate'].includes(e.targetHandle)));
    };
    const history = incoming(user.id, ['history']).filter(expandable);
    const candidateInputs = incoming(predictor.id, ['candidate', 'features']).filter(expandable);
    if (history.length) add('sequence', 'User Sequence', 40, -85, '#0891b2', undefined, 'History in chronological order', 'heading');
    if (candidateInputs.length) add('candidates', matching ? `Candidates · 1 positive + ${count} negatives` : 'Candidate', 40, 455, '#0891b2', undefined,
      matching ? 'Sampled candidates for matching' : 'One candidate per ranking example', 'heading');
    history.forEach((e, i) => {
      [['h1', 'Item 1', 0], ['h2', 'Item 2', 125], ['hN', 'Item N', 310]].forEach(([key, title, y]) => {
        const embedding = encode(i ? `${key}:${i}` : String(key), String(title), Number(y), e, i * 1200);
        link(embedding, u, e);
      });
    });
    if (history.length) add('history:ellipsis', '⋮', 40, 240, '#64748b', undefined, undefined, 'ellipsis');
    if (candidateInputs.length && matching && count > 2) add('negative:ellipsis', '⋮', 40, 790, '#64748b', undefined, undefined, 'ellipsis');
    branches.forEach(c => {
      const p = add(`${c.key}:predictor`, 'Predictor', 1010, c.y, CATEGORY_COLORS.predictor, predictor, 'Shared weights');
      candidateInputs.forEach((e, i) => {
        const embedding = encode(i ? `${c.key}:${i}` : c.key, c.title, c.y, e, i * 1200);
        link(embedding, p, e, 'item');
      });
      graph.edges.filter(e => e.source === user.id && e.target === predictor.id && e.sourceHandle === 'user' && e.targetHandle === 'user').forEach(e => link(ue, p, e, 'user'));
      const score = add(`${c.key}:score`, 'Score', 1270, c.y, CATEGORY_COLORS.predictor);
      Object.assign(nodes[nodes.length - 1].data, { valueKind: 'score', positiveScore: matching && c.key === 'positive', exampleScore: c.key === 'positive' ? '0.732' : c.key === 'negative1' ? '0.218' : '0.406' });
      link(p, score);
      graph.edges.filter(e => e.source === predictor.id && e.target === task.id && e.sourceHandle === 'score').forEach(e => link(score, objective, e));
    });
  }
  graph.nodes.filter(n => !representative.has(n.id)).forEach((n, i) => {
    const dataset = category(n) === 'dataset';
    add(`extra:${n.id}`, dataset ? 'Item' : n.label || specs[n.component]?.name || n.component,
      dataset ? 1010 : 40 + (i % 5) * 290, dataset ? -30 : 1040 + Math.floor(i / 5) * 150,
      dataset ? '#3b82f6' : '#64748b', n, dataset ? 'No expanded item branches' : specs[n.component]?.category);
    if (dataset) nodes[nodes.length - 1].data.datasetProxy = true;
  });
  graph.edges.filter(e => !handled.has(e.id)).forEach(e => {
    const source = representative.get(e.source);
    if (!source || category(graph.nodes.find(n => n.id === e.source)!) === 'dataset') return;
    (aliases.get(e.target) || []).forEach(target => link(source, target, e));
  });
  const userBusTargets = edges.filter(e => e.data?.userBus).map(e => e.target);
  for (const edge of edges) if (edge.data?.userBus) edge.data = { ...edge.data, userBusTargets };
  return { nodes, edges };
}
