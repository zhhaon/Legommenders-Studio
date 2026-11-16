import { describe, it, expect } from 'vitest';
import graphs from './fixtures/modelGraphs.json';
import { alignDetailValues, configLayout, type Rect, type Sizes } from './layout';
import { route, type Point } from './routing';
import type { GraphJson } from '@/types/graph';

function crosses(a: Point, b: Point, r: Rect) {
  return a.x===b.x ? a.x>r.x&&a.x<r.x+r.width&&Math.max(a.y,b.y)>r.y&&Math.min(a.y,b.y)<r.y+r.height : a.y>r.y&&a.y<r.y+r.height&&Math.max(a.x,b.x)>r.x&&Math.min(a.x,b.x)<r.x+r.width;
}
describe('actual recommendation graph layouts',()=> {
  it.each(graphs.map(g=>[g.name,g] as const))('%s preserves topology and avoids cards',(name,raw)=> {
    void name;
    const graph=raw as GraphJson;
    const before=JSON.stringify(graph);
    const sizes:Sizes=Object.fromEntries(graph.nodes.map((n,i)=>[n.id,{width:228+i*23,height:240+i*43}]));
    const positions=configLayout(graph,sizes);
    const rects=graph.nodes.map(n=>({id:n.id,...positions[n.id],...sizes[n.id]}));
    graph.edges.forEach(e=> {
      expect(positions[e.target].x).toBeGreaterThan(positions[e.source].x);
      const s=rects.find(r=>r.id===e.source)!,t=rects.find(r=>r.id===e.target)!;
      const points=route({x:s.x+s.width+24,y:s.y+s.height-30},{x:t.x-24,y:t.y+t.height-30},rects);
      for(let i=1;i<points.length;i++) {
        expect(points[i].x===points[i-1].x||points[i].y===points[i-1].y).toBe(true);
        rects.forEach(r=>expect(crosses(points[i-1],points[i],r)).toBe(false));
      }
    });
    expect(JSON.stringify(graph)).toBe(before);
  });
  it('routes around a tall expanded card blocking a skip connection',()=> {
    const obstacle={id:'long-card',x:300,y:0,width:360,height:650};
    const points=route({x:100,y:200},{x:900,y:200},[obstacle]);
    expect(points.length).toBeGreaterThan(2);
    for(let i=1;i<points.length;i++)expect(crosses(points[i-1],points[i],obstacle)).toBe(false);
  });
});


it('centers flow values on measured encoders and predictors, preserving card positions', () => {
  const nodes = [
    { id: 'h1:encoder', position: { x: 10, y: 100 }, data: {} },
    { id: 'h1:embedding', position: { x: 300, y: 0 }, data: { valueKind: 'item-vector' } },
    { id: 'user:encoder', position: { x: 600, y: 200 }, data: {} },
    { id: 'user:embedding', position: { x: 900, y: 0 }, data: { valueKind: 'user-vector' } },
    { id: 'positive:predictor', position: { x: 900, y: 600 }, data: {} },
    { id: 'positive:score', position: { x: 1200, y: 0 }, data: { valueKind: 'score' } },
  ] as unknown as import('./detailedGraph').DetailNode[];
  const sizes = Object.fromEntries(nodes.map(n => [n.id, { width: 200, height: n.data.valueKind ? 60 : 200 }]));
  const before = JSON.stringify(nodes);
  const result = alignDetailValues(nodes, sizes);
  expect(result.map(n => n.position.y)).toEqual([100, 170, 200, 270, 600, 670]);
  expect(result.map(n => n.position.x)).toEqual(nodes.map(n => n.position.x));
  expect(JSON.stringify(nodes)).toBe(before);
  expect(alignDetailValues(nodes, {})).toEqual(nodes);
});

it('keeps all manually dragged flow values at their requested positions and restores automatic alignment after layout reset', () => {
  const nodes = [
    { id: 'h1:encoder', position: { x: 0, y: 100 }, data: {} },
    { id: 'h1:embedding', position: { x: 300, y: 0 }, data: { valueKind: 'item-vector' } },
    { id: 'user:encoder', position: { x: 600, y: 200 }, data: {} },
    { id: 'user:embedding', position: { x: 900, y: 0 }, data: { valueKind: 'user-vector' } },
    { id: 'positive:predictor', position: { x: 900, y: 600 }, data: {} },
    { id: 'positive:score', position: { x: 1200, y: 0 }, data: { valueKind: 'score' } },
  ] as unknown as import('./detailedGraph').DetailNode[];
  const sizes = Object.fromEntries(nodes.map(node => [node.id, { width: 200, height: node.data.valueKind ? 60 : 200 }]));
  const positions = { 'h1:embedding': { x: 340, y: 222 }, 'user:embedding': { x: 940, y: 322 }, 'positive:score': { x: 1240, y: 722 } };
  const result = alignDetailValues(nodes, sizes, positions);
  for (const [id, position] of Object.entries(positions)) expect(result.find(node => node.id === id)?.position).toEqual(position);
  expect(alignDetailValues(nodes, sizes).filter(node => node.data.valueKind).map(node => node.position.y)).toEqual([170, 270, 670]);
  const movedAnchor = alignDetailValues(nodes, sizes, { 'h1:encoder': { x: 40, y: 400 } });
  expect(movedAnchor.find(node => node.id === 'h1:embedding')?.position.y).toBe(470);
});
