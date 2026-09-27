export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * (0,0)-(w,h) 직사각형을 임의의 사각형 quad(좌상, 우상, 우하, 좌하)로 보내는
 * 투영 변환(homography)을 CSS matrix3d 문자열로 계산한다.
 * 적용 대상 요소는 width=w, height=h, transform-origin: 0 0 이어야 한다.
 *
 * 참고: Heckbert, "Fundamentals of Texture Mapping and Image Warping" (square→quad)
 */
export function rectToQuadMatrix3d(w: number, h: number, quad: readonly [Point, Point, Point, Point]): string {
  const [p0, p1, p2, p3] = quad;
  const dx1 = p1.x - p2.x;
  const dx2 = p3.x - p2.x;
  const dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y;
  const dy2 = p3.y - p2.y;
  const dy3 = p0.y - p1.y + p2.y - p3.y;

  const den = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / den;
  const hh = (dx1 * dy3 - dx3 * dy1) / den;

  // 단위 정사각형 기준 계수
  let a = p1.x - p0.x + g * p1.x;
  let b = p3.x - p0.x + hh * p3.x;
  const c = p0.x;
  let d = p1.y - p0.y + g * p1.y;
  let e = p3.y - p0.y + hh * p3.y;
  const f = p0.y;

  // (w,h) 직사각형 기준으로 스케일
  a /= w;
  d /= w;
  const gw = g / w;
  b /= h;
  e /= h;
  const hw = hh / h;

  // CSS matrix3d 는 column-major
  return `matrix3d(${a},${d},0,${gw},${b},${e},0,${hw},0,0,1,0,${c},${f},0,1)`;
}

/** 같은 변환을 점 하나에 적용 (테스트/히트 테스트용) */
export function projectPoint(w: number, h: number, quad: readonly [Point, Point, Point, Point], x: number, y: number): Point {
  const m = rectToQuadMatrix3d(w, h, quad)
    .slice(9, -1)
    .split(',')
    .map(Number);
  const [a, d, , gw, b, e, , hw, , , , , c, f] = m as number[];
  const z = gw! * x + hw! * y + 1;
  return { x: (a! * x + b! * y + c!) / z, y: (d! * x + e! * y + f!) / z };
}

/** 3×3 행렬 역행렬 (행 우선) */
function invert3(m: number[]): number[] {
  const [a, b, c, d, e, f, g, h, i] = m as [number, number, number, number, number, number, number, number, number];
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const Cc = d * h - e * g;
  const det = a * A + b * B + c * Cc;
  return [
    A / det, -(b * i - c * h) / det, (b * f - c * e) / det,
    B / det, (a * i - c * g) / det, -(a * f - c * d) / det,
    Cc / det, -(a * h - b * g) / det, (a * e - b * d) / det,
  ];
}

/** 화면(스테이지) 좌표 → 평면 좌표 (projectPoint 의 역변환) */
export function unprojectPoint(w: number, h: number, quad: readonly [Point, Point, Point, Point], sx: number, sy: number): Point {
  const m = rectToQuadMatrix3d(w, h, quad).slice(9, -1).split(',').map(Number);
  const [a, d, , gw, b, e, , hw, , , , , c, f] = m as number[];
  // 행 우선 H = [[a b c], [d e f], [gw hw 1]]
  const inv = invert3([a!, b!, c!, d!, e!, f!, gw!, hw!, 1]);
  const z = inv[6]! * sx + inv[7]! * sy + inv[8]!;
  return { x: (inv[0]! * sx + inv[1]! * sy + inv[2]!) / z, y: (inv[3]! * sx + inv[4]! * sy + inv[5]!) / z };
}
