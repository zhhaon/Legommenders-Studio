import { MarkerType, type Edge, type Node } from '@xyflow/react';
import type { GraphJson, GraphNode } from '@/types/graph';
import type { ComponentSpec } from '@/types/catalog';

export type DetailData = Record<string, unknown> & { title: string; subtitle?: string; originalId?: string; color: string; kind?: string };
export type DetailNode = Node<DetailData, 'detail'>;

/** A display projection only: repeated encoders share the original configuration. */
export function detailedGraph(graph: GraphJson, specs: Record<string, ComponentSpec>) {
  const nodes: DetailNode[] = [];
  const edges: Edge[] = [];
  const byCategory = (category: string) => graph.nodes.filter(n => specs[n.component]?.category === category);
  const item = byCategory('item_encoder')[0];
  const user = byCategory('user_encoder')[0];
  const predictor = byCategory('predictor')[0];
  const task = byCategory('training')[0];
  if (!user || !predictor || !task) return null;
  const matching = task.component.includes('matching') ? true : task.component.includes('ranking') ? false : graph.task === 'matching';
  const rawCount = Number(task.params.neg_count ?? specs[task.component]?.parameters.find(p => p.name === 'neg_count')?.default ?? 4);
  const count = Number.isFinite(rawCount) ? Math.max(0, Math.floor(rawCount)) : 4;
  const add = (id: string, title: string, x: number, y: number, color: string, original?: GraphNode, subtitle?: string, kind?: string) => {
    nodes.push({ id, type: 'detail', position: { x, y }, data: { title, color, originalId: original?.id, subtitle, kind }, draggable: false, connectable: false });
    return id;
  };
  const link = (source: string, target: string, label?: string, targetHandle = 'in') => edges.push({
    id: `${source}->${target}:${targetHandle}:${edges.length}`, source, target, sourceHandle: 'out', targetHandle, label: undefined, data: { relation: label, userBus: source === 'user:embedding' },
    type: 'detail', style: { stroke: source === 'user:embedding' ? '#db709d' : '#8b9db5', strokeWidth: 1.8 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#7b91ab' },
  });
  const representative = new Map<string, string>();
  const encode = (prefix: string, title: string, y: number) => {
    const input = add(`${prefix}:item`, title, 40, y, '#0891b2');
    let end = input;
    if (item) {
      end = add(`${prefix}:encoder`, 'Item Encoder', 270, y, '#8b5cf6', item, `${specs[item.component]?.name} · shared weights`);
      link(input, end);
      if (!representative.has(item.id)) representative.set(item.id, end);
    }
    const embedding = add(`${prefix}:embedding`, 'Item Embedding', 510, y, '#6366f1', undefined, item ? 'Encoded item representation' : 'Dataset / precomputed representation');
    link(end, embedding);
    return embedding;
  };
  add('sequence', 'User Sequence', 40, -85, '#0891b2', undefined, 'History in chronological order', 'heading');
  const history = [encode('h1', 'Item 1', 0), encode('h2', 'Item 2', 125), encode('hN', 'Item N', 310)];
  add('history:ellipsis', '…', 40, 240, '#64748b', undefined, undefined, 'ellipsis');
  const u = add('user:encoder', 'User Encoder', 770, 125, '#ec4899', user, specs[user.component]?.name);
  representative.set(user.id, u);
  history.forEach(h => link(h, u));
  const ue = add('user:embedding', 'User Embedding', 1010, 125, '#ec4899');
  link(u, ue);
  add('candidates', matching ? `Candidates · 1 positive + ${count} negatives` : 'Candidate', 40, 455, '#0891b2', undefined, matching ? 'Sampled candidates for matching' : 'One candidate per ranking example', 'heading');
  const candidates: { key: string; title: string; y: number }[] = [{ key: 'positive', title: matching ? 'Positive Candidate' : 'Candidate', y: 540 }];
  if (matching && count > 0) candidates.push({ key: 'negative1', title: 'Negative Candidate 1', y: 675 });
  if (matching && count > 1) candidates.push({ key: 'negativeN', title: `Negative Candidate ${count}`, y: count > 2 ? 860 : 810 });
  if (matching && count > 2) add('negative:ellipsis', '…', 40, 790, '#64748b', undefined, `${count - 2} more negatives`, 'ellipsis');
  const objective = add('objective', matching ? 'Matching Task' : 'Ranking Task', 1540, matching && count > 0 ? 675 : 540, '#f59e0b', task, matching ? `${count + 1} scores · cross entropy` : 'Score + label · binary cross entropy');
  representative.set(task.id, objective);
  candidates.forEach(c => {
    const embedding = encode(c.key, c.title, c.y);
    const p = add(`${c.key}:predictor`, 'Predictor', 1010, c.y, '#10b981', predictor, `${specs[predictor.component]?.name} · shared weights`);
    if (!representative.has(predictor.id)) representative.set(predictor.id, p);
    link(embedding, p, 'item', 'item');
    link(ue, p, 'user', 'user');
    const score = add(`${c.key}:score`, 'Score', 1270, c.y, '#10b981');
    link(p, score);
    link(score, objective);
  });
  // Keep dataset, feature and evaluation branches visible using their actual graph edges.
  const datasets = new Set(byCategory('dataset').map(n => n.id));
  const consumed = new Set([item?.id, user.id, predictor.id, task.id]);
  graph.nodes.filter(n => !consumed.has(n.id)).forEach((n, i) => {
    const id = add(`extra:${n.id}`, n.label || specs[n.component]?.name || n.component, datasets.has(n.id) ? 1010 : 40 + (i % 5) * 290, datasets.has(n.id) ? -30 : 1040 + Math.floor(i / 5) * 150, '#64748b', n, datasets.has(n.id) ? 'Data source · history & candidates' : specs[n.component]?.category);
    representative.set(n.id, id);
  });
  graph.edges.forEach(e => {
    if (datasets.has(e.source)) return;
    if (consumed.has(e.source) && consumed.has(e.target)) return;
    const source = representative.get(e.source), target = representative.get(e.target);
    if (source && target) link(source, target, e.sourceHandle);
  });
  return { nodes, edges };
}
