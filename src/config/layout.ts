import type { CardType, SeatPosition } from '../game/types';

/**
 * 배경(bg_livingroom) 기준 좌표. 모두 배경 1280×720 좌표계 (장면은 SCENE_SHIFT 만큼 위로 올려 그림).
 * 배경 원본(1672×941, 16:9)에서 측정한 값에 0.7656(=1280/1672)을 곱해 환산했다.
 * 배경 이미지를 교체하면 이 파일의 값만 다시 맞추면 된다.
 */

/**
 * 모포 사다리꼴 꼭짓점 (좌상, 우상, 우하, 좌하).
 * 모포가 화면 아래 끝까지 이어지므로 아래 두 꼭짓점은 좌우 변을 배경 하단(y=720)까지 연장한 값.
 */
export const MAT_QUAD = [
  { x: 296, y: 407 },
  { x: 975, y: 407 },
  { x: 1268, y: 720 },
  { x: -2, y: 720 },
] as const;

/**
 * 모포 평면 좌표계. 모포를 위에서 내려다본 평평한 MAT_W × MAT_H 직사각형으로 보고
 * 그 위에 카드를 배치하면 Board 가 투영 변환(matrix3d)으로 사다리꼴 모포에 정확히 눕힌다.
 *  - 위쪽(y=0)  : 먼 쪽 — 가운데 인물(top) 앞
 *  - 아래쪽(y=H): 가까운 쪽 — 나(bottom) 앞
 *  - 왼쪽/오른쪽: 외할머니(left) / 오른쪽 인물(right) 앞
 *
 * 평면 크기가 작을수록 같은 카드가 화면에서 크게 보인다(단위당 픽셀↑).
 * 가로:세로는 카드가 너무 납작해지지 않도록 가독성 쪽으로 잡았다.
 */
export const MAT_W = 760;
export const MAT_H = 400;

/** 모포 위 카드 크기 (평면 좌표) */
export const MAT_CARD = { w: 62, h: 93 } as const;
/** 득점 패 카드 크기 */
export const PILE_CARD = { w: 44, h: 66 } as const;

/** 더미 — 모포 중앙 */
const CENTER_X = 380;
const CENTER_Y = 234;
export const DECK_POS = { x: CENTER_X - MAT_CARD.w / 2, y: CENTER_Y - MAT_CARD.h / 2 };

/**
 * 바닥 패 12칸 (카드 중심 좌표). 더미 양옆 3열 × 2행.
 * 배열 순서 = 새 월이 놓이는 순서. 더미에 가까운 칸부터 바깥쪽으로 채운다.
 */
const COL = [155, 229, 303, 457, 531, 605];
const ROW = [187, 281];
export const FIELD_SLOTS: readonly { x: number; y: number }[] = [
  [2, 0], [3, 0], [2, 1], [3, 1],
  [1, 0], [4, 0], [1, 1], [4, 1],
  [0, 0], [5, 0], [0, 1], [5, 1],
].map(([c, r]) => ({ x: COL[c!]!, y: ROW[r!]! }));

/**
 * 득점(먹은) 패 영역. 종류별로 한 줄씩 겹쳐 쌓는다.
 * { x, y } = 그룹 첫 카드 좌상단, w = 그룹 최대 폭(장수가 많으면 겹침 간격을 줄임)
 *
 * 모포가 앞쪽으로 넓어지면서 좌우 인물의 다리가 모포 양옆 아래쪽을 덮으므로,
 * 좌우 인물의 득점 패는 인물 앞쪽 중에서도 가려지지 않는 먼 쪽 모서리에 2×2 로 놓는다.
 *   ┌ 외할머니 2×2 ┬ 이모부님 한 줄 ┬ 장인어른 2×2 ┐
 *   │            바닥 패 · 더미            │
 *   └──────────── 나 한 줄 ──────────────┘
 */
export type PileRect = { x: number; y: number; w: number };
export type CaptureLayout = Record<CardType, PileRect>;

const cornerZone = (x: number): CaptureLayout => ({
  gwang: { x, y: 4, w: 100 },
  yeol: { x: x + 106, y: 4, w: 100 },
  tti: { x, y: 74, w: 100 },
  pi: { x: x + 106, y: 74, w: 100 },
});

export const CAPTURE_LAYOUT: Record<SeatPosition, CaptureLayout> = {
  left: cornerZone(4),
  top: {
    gwang: { x: 222, y: 4, w: 70 },
    yeol: { x: 298, y: 4, w: 78 },
    tti: { x: 382, y: 4, w: 78 },
    pi: { x: 466, y: 4, w: 76 },
  },
  right: cornerZone(546),
  bottom: {
    gwang: { x: 112, y: 334, w: 100 },
    yeol: { x: 220, y: 334, w: 120 },
    tti: { x: 348, y: 334, w: 120 },
    pi: { x: 476, y: 334, w: 172 },
  },
};

/**
 * 캐릭터 스프라이트 배치 (배경 좌표).
 *  - x, y: 앉은 자리 기준점(다리 하단 중앙)
 *  - height: 대기 프레임 기준 표시 키(px). 원근상 먼 좌석(가운데)일수록 작게.
 */
export const CHARACTER_PLACEMENT: Partial<Record<SeatPosition, { x: number; y: number; height: number }>> = {
  left: { x: 118, y: 606, height: 318 },
  top: { x: 636, y: 399, height: 248 }, // 발끝이 모포 윗변(407) 바로 뒤에 오도록
  right: { x: 1152, y: 606, height: 318 },
};

/** 좌석 이름표 위치 (배경 좌표 — 중심 x, 상단 y: 인물 머리 위) */
export const NAME_TAG_POS: Record<SeatPosition, { x: number; y: number } | undefined> = {
  left: { x: 150, y: 262 },
  top: { x: 636, y: 120 },
  right: { x: 1110, y: 262 },
  bottom: undefined, // 나: 1인칭 — 손패는 하단 전용 패널
};

/** 패를 '탁' 내려놓는 손 위치 (배경 좌표) — 카드가 여기서 모포로 날아간다 */
export const PLAY_ORIGIN: Record<SeatPosition, { x: number; y: number }> = {
  left: { x: 250, y: 600 },
  top: { x: 610, y: 410 },
  right: { x: 990, y: 596 },
  bottom: { x: 640, y: 780 }, // 손패 패널 (배경 아래쪽 바깥)
};
