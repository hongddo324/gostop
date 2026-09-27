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
export const MAT_CARD = { w: 56, h: 84 } as const;
/** 득점 패 카드 크기 */
export const PILE_CARD = { w: 38, h: 57 } as const;
/** 득점 패 겹침 간격: 최소 이만큼은 보이게(카드 폭의 약 40%), 최대 이만큼만 벌린다 */
export const PILE_STEP = { min: 15, max: 26 } as const;
/** 피는 5장씩 한 묶음으로 쌓고 묶음끼리 간격을 둔다 */
export const PI_STACK = { size: 5, inner: 2.5, gap: 30 } as const;

/** 더미 — 모포 중앙 */
const CENTER_X = 380;
const CENTER_Y = 196;
export const DECK_POS = { x: CENTER_X - MAT_CARD.w / 2, y: CENTER_Y - MAT_CARD.h / 2 };

/**
 * 바닥 패 12칸 (카드 중심 좌표). 더미 양옆 2열 × 3행.
 * 배열 순서 = 새 월이 놓이는 순서. 더미에 가까운 칸부터 바깥쪽으로 채운다.
 */
const COL = [254, 322, 438, 506];
const ROW = [108, 196, 284];
export const FIELD_SLOTS: readonly { x: number; y: number }[] = [
  [1, 1], [2, 1], [1, 0], [2, 0], [1, 2], [2, 2],
  [0, 1], [3, 1], [0, 0], [3, 0], [0, 2], [3, 2],
].map(([c, r]) => ({ x: COL[c!]!, y: ROW[r!]! }));

/**
 * 득점(먹은) 패 영역 — 각자 자기 바로 앞. 좌석마다 블록(가이드선 박스) 안에 종류별 그룹.
 * { x, y } = 그룹 첫 카드 좌상단, w = 그룹 폭
 *
 * 외할머니·장인어른 무릎이 모포 양옆(평면 x<≈100, x>≈690)을 덮으므로 그 바로 안쪽에 세로 4줄로 둔다.
 *   ┌──────── 이모부님 한 줄 ────────┐
 *   │ 외할머니 │   바닥 패 · 더미   │ 장인어른 │
 *   └──────────── 나 한 줄 ─────────────┘
 */
export type PileRect = { x: number; y: number; w: number };
export type CaptureLayout = Record<CardType, PileRect>;
export type ZoneBlock = { x: number; y: number; w: number; h: number };

export const ZONE_BLOCK: Record<SeatPosition, ZoneBlock> = {
  left: { x: 100, y: 114, w: 122, h: 210 },
  top: { x: 218, y: 1, w: 324, h: 62 },
  right: { x: 538, y: 114, w: 122, h: 210 },
  bottom: { x: 58, y: 328, w: 644, h: 70 },
};

const SIDE_ROWS = [118, 164, 210, 256];
const sideZone = (b: ZoneBlock): CaptureLayout => ({
  gwang: { x: b.x + 4, y: SIDE_ROWS[0]!, w: b.w - 8 },
  yeol: { x: b.x + 4, y: SIDE_ROWS[1]!, w: b.w - 8 },
  tti: { x: b.x + 4, y: SIDE_ROWS[2]!, w: b.w - 8 },
  pi: { x: b.x + 4, y: SIDE_ROWS[3]!, w: b.w - 8 },
});

export const CAPTURE_LAYOUT: Record<SeatPosition, CaptureLayout> = {
  left: sideZone(ZONE_BLOCK.left),
  right: sideZone(ZONE_BLOCK.right),
  top: {
    gwang: { x: 222, y: 3, w: 66 },
    yeol: { x: 292, y: 3, w: 80 },
    tti: { x: 376, y: 3, w: 80 },
    pi: { x: 460, y: 3, w: 78 },
  },
  bottom: {
    gwang: { x: 66, y: 335, w: 100 },
    yeol: { x: 174, y: 335, w: 150 },
    tti: { x: 332, y: 335, w: 150 },
    pi: { x: 490, y: 335, w: 206 },
  },
};

/** 좌석별 득점 패 회전 (외할머니·장인어른 쪽은 본인 방향으로 180°) */
export const PILE_ROTATION: Record<SeatPosition, number> = { left: 180, right: 180, top: 0, bottom: 0 };

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

/** 좌석별 돈(지폐 묶음) 위치 (배경 좌표 — 이름표 옆). alignRight 면 x 가 오른쪽 끝 */
export const MONEY_POS: Partial<Record<SeatPosition, { x: number; y: number; alignRight?: boolean }>> = {
  // 말풍선(이름표 위, 폭 ±120)과 겹치지 않는 자리
  left: { x: 282, y: 282 },
  top: { x: 772, y: 116 },
  right: { x: 982, y: 282, alignRight: true },
};

/** 광 팔고 나갈 때 걸어가는 가로 거리 (배경 좌표, 음수=왼쪽) — 시트의 걷는 방향과 맞춤 */
export const EXIT_DX: Record<SeatPosition, number> = { left: -340, top: 420, right: 320, bottom: 0 };

/** 훈수 채팅(카톡) 창 위치 — 광 판 사람이 앉았던 빈자리 (배경 좌표, 좌상단·폭) */
export const CHAT_POS: Partial<Record<SeatPosition, { x: number; y: number; w: number }>> = {
  left: { x: 14, y: 300, w: 300 },
  top: { x: 470, y: 150, w: 290 }, // 이모부님 지폐(x 772~) 와 겹치지 않게
  right: { x: 966, y: 300, w: 300 },
};

/** 패를 '탁' 내려놓는 손 위치 (배경 좌표) — 카드가 여기서 모포로 날아간다 */
export const PLAY_ORIGIN: Record<SeatPosition, { x: number; y: number }> = {
  left: { x: 250, y: 600 },
  top: { x: 610, y: 410 },
  right: { x: 990, y: 596 },
  bottom: { x: 640, y: 780 }, // 손패 패널 (배경 아래쪽 바깥)
};
