import { expect, it } from 'vitest';
import { userBusRoute } from './routing';
it('shares an approach and vertical bus, then branches at each predictor', () => {
  const targets = [100, 300, 500].map((y, i) => ({ id: `p${i}`, x: 600, y, width: 228, height: 160 }));
  const rects = [...targets, { id: 'user', x: 600, y: -180, width: 250, height: 60 }];
  const paths = targets.map(r => userBusRoute({ x: 874, y: -150 }, { x: r.x - 24, y: r.y + 40 }, rects, targets));
  const prefix = paths[0].slice(0, -2);
  paths.forEach((path, i) => {
    expect(path.slice(0, -2)).toEqual(prefix);
    expect(path.at(-2)).toEqual({ x: 560, y: targets[i].y + 40 });
    expect(path.at(-1)).toEqual({ x: 576, y: targets[i].y + 40 });
  });
});
