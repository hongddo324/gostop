import type { CardType, SeatPosition } from '../game/types';

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

/**
 * 모포 평면 좌표계. 모포를 위에서 내려다본 평평한 MAT_W × MAT_H 직사각형으로 보고
 * 그 위에 카드를 배치하면 Board 가 투영 변환(matrix3d)으로 사다리꼴 모포에 정확히 눕힌다.
 *  - 위쪽(y=0)  : 먼 쪽 — 가운데 인물(top) 앞
 *  - 아래쪽(y=H): 가까운 쪽 — 나(bottom) 앞
 *  - 왼쪽/오른쪽: 외할머니(left) / 오른쪽 인물(right) 앞
 *
 * 평면 크기가 작을수록 같은 카드가 화면에서 크게 보인다(단위당 픽셀↑).
 * 실제 모포 비율(≈3:2)이면 카드가 너무 납작해져 가독성 쪽으로 약 2.2:1 로 잡았다.
 *
 * 배경 인물에 가려지는 모포 영역 (역투영으로 측정):
 *  - 외할머니 무릎: x < 86 (y 0~210)
 *  - 오른쪽 인물 무릎: x > 685 (y 90~240)
 *  - 가운데 인물 발: x 266~459, y < 42
 */
export const MAT_W = 700;
export const MAT_H = 320;

/** 모포 위 카드 크기 (평면 좌표) */
export const MAT_CARD = { w: 56, h: 84 } as const;
export const PILE_CARD = { w: 30, h: 45 } as const;

/** 더미 — 보이는 모포(x 86~685)의 중앙 */
const CENTER_X = 386;
const CENTER_Y = 148;
export const DECK_POS = { x: CENTER_X - MAT_CARD.w / 2, y: CENTER_Y - MAT_CARD.h / 2 };

/**
 * 바닥 패 12칸 (카드 중심 좌표). 더미 양옆 3열 × 2행.
 * 배열 순서 = 채워지는 순서. 더미에 가까운 칸부터 바깥쪽으로 채운다.
 */
const COL = [202, 262, 322, 450, 510, 570];
const ROW = [100, 196];
export const FIELD_SLOTS: readonly { x: number; y: number }[] = [
  [2, 0], [3, 0], [2, 1], [3, 1],
  [1, 0], [4, 0], [1, 1], [4, 1],
  [0, 0], [5, 0], [0, 1], [5, 1],
].map(([c, r]) => ({ x: COL[c!]!, y: ROW[r!]! }));

/**
 * 득점(먹은) 패 영역 — 각자 자기 앞 모포 가장자리. 종류별로 한 줄씩 겹쳐 쌓는다.
 * { x, y } = 그룹 첫 카드 좌상단, w = 그룹 최대 폭(장수가 많으면 겹침 간격을 줄임)
 */
export type PileRect = { x: number; y: number; w: number };
export type CaptureLayout = Record<CardType, PileRect>;

const SIDE_ROWS = [52, 100, 148, 196];
const sideZone = (x: number, w: number): CaptureLayout => ({
  gwang: { x, y: SIDE_ROWS[0]!, w },
  yeol: { x, y: SIDE_ROWS[1]!, w },
  tti: { x, y: SIDE_ROWS[2]!, w },
  pi: { x, y: SIDE_ROWS[3]!, w },
});

export const CAPTURE_LAYOUT: Record<SeatPosition, CaptureLayout> = {
  // 먼 쪽 가장자리 — 가운데 인물 발(x 266~459)을 피해 좌/우로 나눈다
  top: {
    gwang: { x: 92, y: 2, w: 66 },
    yeol: { x: 164, y: 2, w: 96 },
    tti: { x: 464, y: 2, w: 90 },
    pi: { x: 560, y: 2, w: 122 },
  },
  // 왼쪽/오른쪽 가장자리 세로 4줄 (무릎에 가려지는 영역은 피함)
  left: sideZone(88, 84),
  right: sideZone(600, 84),
  // 가까운 쪽 가장자리 — 오른쪽 아래는 내 패 트레이 자리
  bottom: {
    gwang: { x: 90, y: 256, w: 56 },
    yeol: { x: 150, y: 256, w: 76 },
    tti: { x: 230, y: 256, w: 76 },
    pi: { x: 310, y: 256, w: 124 },
  },
};

/** AI 손패(부채꼴) 3D 연출 파라미터 */
export interface HandPose {
  /** 부채 회전축(손 위치) — 인물 무릎/손 근처 */
  x: number;
  y: number;
  /** 인물이 바라보는 방향으로 카드면을 돌린다 (deg) */
  rotateY: number;
  /** 카드 윗부분을 인물 쪽으로 눕힌다 (deg) */
  rotateX: number;
  /** 손목 기울기 (deg) */
  rotateZ: number;
  /** 부채 펼침 각도 합계 (deg) */
  spread: number;
}

/**
 * 좌석별 배치. 캐릭터는 배경에 그려져 있으므로 이름표와 AI 손패만 얹는다.
 *  - nameTag: 이름표 중심 x, 상단 y (인물 머리 위)
 *  - hand: AI 손패 — 인물이 손에 쥔 부채꼴(뒷면), 배경 인물 시선/자세에 맞춘 원근
 */
export const SEAT_LAYOUT: Record<SeatPosition, { nameTag?: { x: number; y: number }; hand?: HandPose }> = {
  // 외할머니: 화면 왼쪽, 오른쪽(모포)을 바라봄
  left: {
    nameTag: { x: 160, y: 168 },
    hand: { x: 250, y: 468, rotateY: 50, rotateX: 10, rotateZ: 12, spread: 56 },
  },
  // 가운데 인물: 정면(나)을 바라봄 → 카드면이 본인 쪽이라 우리는 뒷면을 정면으로 봄
  top: {
    nameTag: { x: 616, y: 104 },
    hand: { x: 616, y: 398, rotateY: 0, rotateX: 18, rotateZ: 0, spread: 60 },
  },
  // 화면 오른쪽 인물: 왼쪽(모포)을 바라봄
  right: {
    nameTag: { x: 1133, y: 178 },
    hand: { x: 1010, y: 486, rotateY: -50, rotateX: 10, rotateZ: -12, spread: 56 },
  },
  // 나: 1인칭 — 손패는 하단 전용 패널(MyHand)
  bottom: {},
};
