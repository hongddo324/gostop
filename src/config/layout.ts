import type { CardType, SeatPosition } from '../game/types';

/**
 * 배경(bg_livingroom) 기준 좌표. 모두 논리 해상도 1280×720 좌표계.
 * 배경 원본(1672×941, 16:9)에서 측정한 값에 0.7656(=1280/1672)을 곱해 환산했다.
 * 배경 이미지를 교체하면 이 파일의 값만 다시 맞추면 된다.
 */

/** 모포 사다리꼴 꼭짓점 (좌상, 우상, 우하, 좌하) */
export const MAT_QUAD = [
  { x: 292, y: 408 },
  { x: 947, y: 408 },
  { x: 1056, y: 641 },
  { x: 113, y: 641 },
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
 * 캐릭터는 모포 가장자리를 최소한으로 가리도록 바깥쪽에 배치했다(CHARACTER_PLACEMENT).
 * 우하단은 내 패 트레이가 덮으므로(평면 x > 440, y > 250) 비워 둔다.
 */
export const MAT_W = 700;
export const MAT_H = 320;

/** 모포 위 카드 크기 (평면 좌표) */
export const MAT_CARD = { w: 56, h: 84 } as const;
/** 득점 패 카드 크기 — 캐릭터 앞 패가 잘 보이도록 바닥 패의 약 70% */
export const PILE_CARD = { w: 40, h: 60 } as const;

/** 더미 — 모포 중앙 */
const CENTER_X = 350;
const CENTER_Y = 158;
export const DECK_POS = { x: CENTER_X - MAT_CARD.w / 2, y: CENTER_Y - MAT_CARD.h / 2 };

/**
 * 바닥 패 12칸 (카드 중심 좌표). 더미 양옆 3열 × 2행.
 * 배열 순서 = 새 월이 놓이는 순서. 더미에 가까운 칸부터 바깥쪽으로 채운다.
 */
const COL = [152, 216, 280, 420, 484, 548];
const ROW = [110, 206];
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

const SIDE_ROWS = [2, 64, 126, 188];
const sideZone = (x: number, w: number): CaptureLayout => ({
  gwang: { x, y: SIDE_ROWS[0]!, w },
  yeol: { x, y: SIDE_ROWS[1]!, w },
  tti: { x, y: SIDE_ROWS[2]!, w },
  pi: { x, y: SIDE_ROWS[3]!, w },
});

export const CAPTURE_LAYOUT: Record<SeatPosition, CaptureLayout> = {
  // 먼 쪽 가장자리 한 줄 (좌우 가장자리 영역 사이)
  top: {
    gwang: { x: 106, y: 2, w: 92 },
    yeol: { x: 206, y: 2, w: 110 },
    tti: { x: 324, y: 2, w: 110 },
    pi: { x: 442, y: 2, w: 152 },
  },
  // 왼쪽/오른쪽 가장자리 세로 4줄
  left: sideZone(4, 96),
  right: sideZone(600, 96),
  // 가까운 쪽 가장자리 — 우하단(트레이 자리) 제외
  bottom: {
    gwang: { x: 4, y: 258, w: 82 },
    yeol: { x: 94, y: 258, w: 100 },
    tti: { x: 202, y: 258, w: 100 },
    pi: { x: 310, y: 258, w: 132 },
  },
};

/**
 * 캐릭터 스프라이트 배치 (배경과 분리된 레이어).
 *  - x, y: 앉은 자리 기준점(다리 하단 중앙)의 스테이지 좌표
 *  - height: 대기 프레임 기준 표시 키(px). 원근상 먼 좌석(가운데)일수록 작게.
 */
export const CHARACTER_PLACEMENT: Partial<Record<SeatPosition, { x: number; y: number; height: number }>> = {
  left: { x: 128, y: 548, height: 322 },
  top: { x: 620, y: 408, height: 266 },
  right: { x: 1142, y: 578, height: 346 },
};

/** 좌석 이름표 위치 (중심 x, 상단 y — 인물 머리 위) */
export const NAME_TAG_POS: Record<SeatPosition, { x: number; y: number } | undefined> = {
  left: { x: 150, y: 196 },
  top: { x: 620, y: 110 },
  right: { x: 1090, y: 200 },
  // 나: 1인칭 — 손패는 우하단 전용 패널(MyHand)
  bottom: undefined,
};

/** 패를 낼 때 카드가 출발하는 위치 (스테이지 좌표 — 캐릭터가 팔을 뻗은 손끝 / 내 트레이) */
export const PLAY_ORIGIN: Record<SeatPosition, { x: number; y: number }> = {
  left: { x: 300, y: 470 },
  top: { x: 590, y: 360 },
  right: { x: 990, y: 480 },
  bottom: { x: 990, y: 660 },
};
