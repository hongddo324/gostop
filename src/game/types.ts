/** 화투 월 (1~12). 13 = 보너스패 (월 없음 — 바닥에 놓이지 않고 바로 득점 패로 간다) */
export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
export const BONUS_MONTH = 13;

/** 카드 종류: 광 / 열끗 / 띠 / 피 */
export type CardType = 'gwang' | 'yeol' | 'tti' | 'pi';

/** 띠 세부 종류 — 족보(홍단/청단/초단) 계산용 */
export type RibbonKind = 'hong' | 'cheong' | 'cho' | 'plain';

export interface HwatuCard {
  /** 고유 ID. 예: "03-gwang", "11-pi-2". 이미지 파일명으로도 사용한다. */
  readonly id: string;
  readonly month: Month;
  readonly type: CardType;
  /** 화면 표기용 이름. 예: "1월 광", "3월 사쿠라" */
  readonly name: string;
  /** 띠인 경우 세부 종류 */
  readonly ribbon?: RibbonKind;
  /** 피 점수 (일반 피 1, 쌍피 2, 쓰리피 3). 피가 아니면 0 */
  readonly piValue: 0 | 1 | 2 | 3;
  /** 보너스패 (쌍피/쓰리피) */
  readonly isBonus?: boolean;
  /** 고도리 새 (2·4·8월 열끗) */
  readonly isGodori?: boolean;
  /** 비광 (12월 광) — 3광 계산 시 예외 처리용 */
  readonly isBiGwang?: boolean;
  /** 국진 (9월 열끗) — 열끗/쌍피 선택 가능 */
  readonly isGukjin?: boolean;
}

export type SeatPosition = 'bottom' | 'left' | 'top' | 'right';

export interface PlayerSeat {
  readonly id: string;
  readonly name: string;
  readonly position: SeatPosition;
  readonly isHuman: boolean;
}

export interface PlayerState {
  readonly seat: PlayerSeat;
  readonly hand: HwatuCard[];
  /** 먹은(득점) 패 */
  readonly captured: HwatuCard[];
  /** 고 횟수 */
  readonly goCount: number;
  /** 마지막으로 고를 부른 시점의 점수 — 이보다 점수가 올라야 다시 고/스톱 가능 */
  readonly goScore: number;
}

/**
 * 한 턴의 진행 단계
 *  play    : 현재 플레이어가 손패 1장을 낸다
 *  choose  : 같은 월 2장 중 먹을 패 선택 대기 (낸 패 또는 뒤집은 패)
 *  flip    : 더미 맨 위 1장을 뒤집는다
 *  resolve : 먹기/뻑/쪽/따닥/싹쓸이 정산
 *  goStop  : 점수 조건 충족 — 고 또는 스톱 선택 대기
 *  end     : 판 종료 (승자 또는 나가리)
 */
export type Phase = 'play' | 'choose' | 'flip' | 'resolve' | 'goStop' | 'end';

export interface PendingChoice {
  readonly kind: 'play' | 'flip';
  readonly card: HwatuCard;
  readonly options: HwatuCard[];
}

export interface TurnState {
  readonly played?: HwatuCard;
  /** 낸 패가 짝지을 바닥 패 */
  readonly playedTarget?: HwatuCard;
  /** 낸 시점에 바닥에 있던 같은 월 장수 */
  readonly playedMatch: number;
  readonly flipped?: HwatuCard;
  readonly flippedTarget?: HwatuCard;
  /** 이번 턴에 얻은 보너스패 (손에서 낸 것 + 뒤집어서 나온 것) */
  readonly bonus?: HwatuCard[];
}

/** 특수 상황: 쪽 / 뻑 / 따닥 / 뻑 먹기 / 싹쓸이 */
export type SpecialEvent = 'jjok' | 'ppeok' | 'ttadak' | 'ppeokEat' | 'sweep' | 'bonus';

/** 직전 턴 결과 (연출/로그용) */
export interface TurnReport {
  readonly seq: number;
  readonly seatId: string;
  readonly captured: HwatuCard[];
  readonly specials: SpecialEvent[];
  readonly stolen: { fromSeatId: string; card: HwatuCard }[];
  readonly scoreBefore: number;
  readonly scoreAfter: number;
}

export interface LoserSettlement {
  readonly seatId: string;
  readonly gwangBak: boolean;
  readonly piBak: boolean;
  readonly points: number;
}

/** 광 팔기: 4명 중 1명이 받은 패의 광을 팔고 빠져 훈수를 둔다 */
export interface GwangSale {
  readonly sellerId: string;
  /** 광 판 사람이 받았던 7장 (판 뒤 더미 맨 아래로 돌아감) */
  readonly hand: HwatuCard[];
  readonly gwangCount: number;
  /** 플레이어 1명이 내는 광값 */
  readonly pricePerPlayer: number;
}

export interface GameResult {
  /** null = 나가리(무승부) */
  readonly winnerId: string | null;
  readonly baseScore: number;
  readonly goCount: number;
  /** 고 보너스 반영 점수 (박 적용 전) */
  readonly score: number;
  readonly losers: LoserSettlement[];
}

export interface GameState {
  /** 실제 플레이 중인 3명 — 배열 순서가 곧 턴 순서(반시계: 나 → 오른쪽 → 위 → 왼쪽) */
  readonly players: PlayerState[];
  /** 광 판 사람 = 훈수 좌석 */
  readonly observer: PlayerSeat;
  readonly gwangSale: GwangSale;
  readonly field: HwatuCard[];
  readonly deck: HwatuCard[];
  /** 현재 차례 플레이어 인덱스 */
  readonly current: number;
  readonly phase: Phase;
  readonly turn: TurnState;
  readonly pending?: PendingChoice;
  /** 바닥에 뻑으로 쌓여 있는 월 */
  readonly ppeokMonths: Month[];
  readonly lastReport?: TurnReport;
  readonly result?: GameResult;
}
