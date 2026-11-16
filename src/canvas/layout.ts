import type { GraphJson, Position } from '@/types/graph';
import type { DetailNode } from './detailedGraph';
export type Sizes = Record<string, { width: number; height: number }>;
export type Rect = { id: string; x: number; y: number; width: number; height: number };

/** Longest-path layers derived from actual edges, never a model-name lookup. */
export function configLayout(graph: GraphJson, sizes: Sizes = {}): Record<string, Position> {
  const ids = new Set(graph.nodes.map(n => n.id));
  const remaining = new Set(ids), rank = new Map<string, number>();
  while (remaining.size) {
    const ready = [...remaining].filter(id => graph.edges.filter(e => e.target === id && ids.has(e.source)).every(e => rank.has(e.source)));
    if (!ready.length) { for (const id of remaining) rank.set(id, 0); break; }
    for (const id of ready) {
      rank.set(id, Math.max(0, ...graph.edges.filter(e => e.target === id).map(e => (rank.get(e.source) ?? -1) + 1)));
      remaining.delete(id);
    }
  }
  const result: Record<string, Position> = {};
  let x = 60;
  for (const layer of [...new Set(rank.values())].sort((a,b) => a-b)) {
    const group = graph.nodes.filter(n => rank.get(n.id) === layer).sort((a,b) => a.position.y-b.position.y || a.id.localeCompare(b.id));
    let y = 100;
    for (const n of group) { result[n.id] = { x, y }; y += (sizes[n.id]?.height ?? 320) + 100; }
    x += Math.max(...group.map(n => sizes[n.id]?.width ?? 300)) + 180;
  }
  return result;
}

export function detailLayout(nodes: DetailNode[], sizes: Sizes): DetailNode[] {
  const columns = [...new Set(nodes.filter(n=>!n.data.kind).map(n=>n.position.x))].sort((a,b)=>a-b);
  const xs = new Map<number, number>(); let x = 40;
  for (const col of columns) { xs.set(col,x); x += Math.max(228,...nodes.filter(n=>n.position.x===col&&!n.data.kind).map(n=>sizes[n.id]?.width??260)) + 100; }
  const rows = [...new Set(nodes.filter(n=>!n.id.startsWith('extra:')).map(n=>n.position.y))].sort((a,b)=>a-b);
  const ys = new Map<number, number>(); let growth = 0;
  for (const row of rows) {
    ys.set(row,row+growth);
    growth += Math.max(0, ...nodes.filter(n=>n.position.y===row&&!n.data.kind).map(n=>(sizes[n.id]?.height??130)-78));
  }
  return nodes.map(n => {
    const anchorId = n.id === 'history:ellipsis' ? 'hN:item' : n.id === 'negative:ellipsis' ? 'negativeN:item' : undefined;
    const anchor = anchorId ? nodes.find(candidate => candidate.id === anchorId) : undefined;
    const data = anchor ? { ...n.data, ellipsisWidth: sizes[anchor.id]?.width ?? 180 } : n.data;
    return { ...n, data, position: { x: xs.get(n.position.x) ?? n.position.x, y: ys.get(n.position.y) ?? n.position.y } };
  });
}

export function rectangles(nodes: {id:string;position:Position;data?:Record<string,unknown>}[], sizes: Sizes): Rect[] {
  return nodes.filter(n=>!n.data?.kind).map(n=>({id:n.id,...n.position,width:sizes[n.id]?.width??300,height:sizes[n.id]?.height??320}));
}

/** Align automatic representations to their producer while respecting explicit drag positions. */
export function alignDetailValues(nodes: DetailNode[], sizes: Sizes, manualPositions: Record<string, Position> = {}): DetailNode[] {
  const positioned = nodes.map(node => manualPositions[node.id] ? { ...node, position: manualPositions[node.id] } : node);
  const byId = new Map(positioned.map(node => [node.id, node]));
  return positioned.map(node => {
    if (manualPositions[node.id]) return node;
    const anchorId = node.data.valueKind === 'item-vector' ? node.id.replace(/:embedding$/, ':encoder')
      : node.data.valueKind === 'user-vector' ? 'user:encoder'
      : node.data.valueKind === 'score' ? node.id.replace(/:score$/, ':predictor') : undefined;
    const anchor = anchorId ? byId.get(anchorId) : undefined;
    const height = sizes[node.id]?.height;
    const anchorHeight = anchor && sizes[anchor.id]?.height;
    if (!anchor || height === undefined || anchorHeight === undefined) return node;
    return { ...node, position: { ...node.position, y: anchor.position.y + (anchorHeight - height) / 2 } };
  });
}
