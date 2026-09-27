import type { SeatPosition } from '../game/types';

/**
 * 배경(bg_livingroom) 기준 좌표. 모두 논리 해상도 1280×720 좌표계.
 * 배경 원본(1672×941, 16:9)에서 측정한 값에 0.7656(=1280/1672)을 곱해 환산했다.
 * 배경 이미지를 교체하면 이 파일의 값만 다시 맞추면 된다.
 */

/** 모포 사다리꼴 꼭짓점 (좌상, 우상, 우하, 좌하) */
export const MAT_QUAD = [
  { x: 289, y: 410 },
  { x: 946, y: 410 },
  { x: 1057, y: 642 },
  { x: 113, y: 642 },
] as const;

/** 더미(Deck) 위치 — 모포 중앙 */
export const DECK_POS = { x: 572, y: 440 };

/**
 * 바닥 패 12칸 (md 카드 56×90 기준 좌상단 좌표).
 * 배열 순서 = 채워지는 순서. 더미에 가까운 안쪽 칸부터 바깥쪽으로 채운다.
 * 아랫줄은 원근감에 맞춰 간격을 조금 넓혔다.
 */
const ROW1_Y = 414;
const ROW2_Y = 508;
export const FIELD_SLOTS: readonly { x: number; y: number }[] = [
  { x: 472, y: ROW1_Y }, { x: 672, y: ROW1_Y },
  { x: 440, y: ROW2_Y }, { x: 700, y: ROW2_Y },
  { x: 406, y: ROW1_Y }, { x: 738, y: ROW1_Y },
  { x: 370, y: ROW2_Y }, { x: 770, y: ROW2_Y },
  { x: 340, y: ROW1_Y }, { x: 804, y: ROW1_Y },
  { x: 300, y: ROW2_Y }, { x: 840, y: ROW2_Y },
];

/**
 * 좌석별 배치. 캐릭터는 배경에 그려져 있으므로 이름표와 AI 손패만 얹는다.
 *  - nameTag: 이름표 중심 x, 상단 y (인물 머리 위)
 *  - hand: AI 손패(뒷면) 좌상단 — 인물 옆 바닥
 */
export const SEAT_LAYOUT: Record<
  SeatPosition,
  { nameTag: { x: number; y: number }; hand?: { x: number; y: number } }
> = {
  left: { nameTag: { x: 160, y: 168 }, hand: { x: 16, y: 588 } },
  top: { nameTag: { x: 616, y: 104 }, hand: { x: 772, y: 318 } },
  right: { nameTag: { x: 1133, y: 178 }, hand: { x: 1112, y: 588 } },
  bottom: { nameTag: { x: 60, y: 684 } },
};
