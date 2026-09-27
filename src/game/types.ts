/** 화투 월 (1~12) */
export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

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
  /** 피 점수 (일반 피 1, 쌍피 2). 피가 아니면 0 */
  readonly piValue: 0 | 1 | 2;
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
  /** 먹은 패 (2단계 이후 사용) */
  readonly captured: HwatuCard[];
}

export interface GameState {
  /** 실제 플레이 중인 3명 */
  readonly players: PlayerState[];
  /** 참관/훈수 좌석 */
  readonly observer: PlayerSeat;
  readonly field: HwatuCard[];
  readonly deck: HwatuCard[];
}
