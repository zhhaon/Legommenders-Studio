import { BaseEdge, type EdgeProps } from '@xyflow/react';
import type { Rect } from './layout';
import { route } from './routing';

export function DetailEdge(props: EdgeProps) {
  const rects = (props.data?.rects ?? []) as Rect[];
  const source = rects.find(r=>r.id===props.source), target = rects.find(r=>r.id===props.target);
  const start = {x:Math.max(props.sourceX+24,source ? source.x+source.width+24:0),y:props.sourceY};
  const end = {x:Math.min(props.targetX-24,target ? target.x-24:props.targetX-24),y:props.targetY};
  const points = [{x:props.sourceX,y:props.sourceY},...route(start,end,rects),{x:props.targetX,y:props.targetY}];
  const path = points.map((p,i)=>`${i?'L':'M'} ${p.x} ${p.y}`).join(' ');
  return <BaseEdge id={props.id} path={path} markerEnd={props.markerEnd} style={props.style} />;
}
