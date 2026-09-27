import { describe, expect, it } from 'vitest';
import { projectPoint, unprojectPoint } from './homography';

describe('rectToQuadMatrix3d', () => {
  const quad = [
    { x: 289, y: 410 },
    { x: 946, y: 410 },
    { x: 1057, y: 642 },
    { x: 113, y: 642 },
  ] as const;

  it('평면 네 꼭짓점이 모포 꼭짓점으로 정확히 사상된다', () => {
    const corners = [
      [0, 0],
      [900, 0],
      [900, 600],
      [0, 600],
    ] as const;
    corners.forEach(([x, y], i) => {
      const p = projectPoint(900, 600, quad, x, y);
      expect(p.x).toBeCloseTo(quad[i]!.x, 6);
      expect(p.y).toBeCloseTo(quad[i]!.y, 6);
    });
  });

  it('원근: 먼 쪽(위) 절반이 가까운 쪽(아래) 절반보다 화면에서 짧다', () => {
    const top = projectPoint(900, 600, quad, 450, 0).y;
    const mid = projectPoint(900, 600, quad, 450, 300).y;
    const bottom = projectPoint(900, 600, quad, 450, 600).y;
    expect(mid - top).toBeLessThan(bottom - mid);
  });

  it('역변환: unproject(project(p)) = p', () => {
    for (const [x, y] of [[100, 50], [350, 160], [690, 310]] as const) {
      const s = projectPoint(700, 320, quad, x, y);
      const back = unprojectPoint(700, 320, quad, s.x, s.y);
      expect(back.x).toBeCloseTo(x, 6);
      expect(back.y).toBeCloseTo(y, 6);
    }
  });
});
