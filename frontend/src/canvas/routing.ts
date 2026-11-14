import type { Rect } from './layout';
export type Point = { x: number; y: number };
/** Every candidate segment is checked against all card bounds. */
export function route(start: Point, end: Point, rects: Rect[]): Point[] {
  const boxes = rects.map(r=>({l:r.x-12,r:r.x+r.width+12,t:r.y-12,b:r.y+r.height+12}));
  const xs = [...new Set([start.x,end.x,...boxes.flatMap(b=>[b.l,b.r])])].sort((a,b)=>a-b);
  const ys = [...new Set([start.y,end.y,...boxes.flatMap(b=>[b.t,b.b])])].sort((a,b)=>a-b);
  const at = (i:number) => ({x:xs[i%xs.length],y:ys[Math.floor(i/xs.length)]});
  const clear = (a:Point,b:Point) => !boxes.some(r => a.x===b.x ? a.x>r.l&&a.x<r.r&&Math.max(a.y,b.y)>r.t&&Math.min(a.y,b.y)<r.b : a.y>r.t&&a.y<r.b&&Math.max(a.x,b.x)>r.l&&Math.min(a.x,b.x)<r.r);
  const first=ys.indexOf(start.y)*xs.length+xs.indexOf(start.x), last=ys.indexOf(end.y)*xs.length+xs.indexOf(end.x);
  const open = new Set([first]), distance = new Map([[first,0]]), previous = new Map<number,number>();
  while(open.size) {
    const id=[...open].reduce((a,b)=>(distance.get(a)!+Math.abs(at(a).x-end.x)+Math.abs(at(a).y-end.y))<(distance.get(b)!+Math.abs(at(b).x-end.x)+Math.abs(at(b).y-end.y))?a:b);
    if(id===last) { const path=[at(id)];let current=id;while(previous.has(current)){current=previous.get(current)!;path.unshift(at(current));}return path.filter((p,i,a)=>i===0||i===a.length-1||!((a[i-1].x===p.x&&p.x===a[i+1].x)||(a[i-1].y===p.y&&p.y===a[i+1].y))); }
    open.delete(id);
    const col=id%xs.length,row=Math.floor(id/xs.length);
    const neighbours=[col>0?id-1:-1,col<xs.length-1?id+1:-1,row>0?id-xs.length:-1,row<ys.length-1?id+xs.length:-1].filter(i=>i>=0);
    for(const next of neighbours) {
      const a=at(id),b=at(next);if(!clear(a,b))continue;
      const before=previous.has(id)?at(previous.get(id)!):undefined;
      const bend=before&&((before.x===a.x)!==(a.x===b.x))?25:0;
      const cost=distance.get(id)!+Math.abs(a.x-b.x)+Math.abs(a.y-b.y)+bend;
      if(cost<(distance.get(next)??Infinity)){distance.set(next,cost);previous.set(next,id);open.add(next);}
    }
  }
  return [start,{x:start.x,y:end.y},end];
}
