import { describe, it, expect } from 'vitest';
import graphs from './fixtures/modelGraphs.json';
import { configLayout, type Rect, type Sizes } from './layout';
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
