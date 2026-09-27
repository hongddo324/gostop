import { RULES } from './rules';
import type { PlayerSeat } from './types';

/** 거실 좌석 배치. 나는 항상 하단(bottom). */
export const SEATS: readonly PlayerSeat[] = [
  { id: 'me', name: '나', position: 'bottom', isHuman: true },
  { id: 'grandma', name: '외할머니', position: 'left', isHuman: false },
  { id: 'uncle', name: '이모부님', position: 'top', isHuman: false },
  { id: 'father-in-law', name: '장인어른', position: 'right', isHuman: false },
];

/** 훈수(광 판 사람) 좌석을 제외한 3명의 플레이어와 훈수를 분리 */
export function splitSeats(observerId: string): { players: PlayerSeat[]; observer: PlayerSeat } {
  const observer = SEATS.find((s) => s.id === observerId);
  if (!observer) throw new Error(`없는 좌석입니다: ${observerId}`);
  return { players: SEATS.filter((s) => s.id !== observerId), observer };
}

/** 이번 판에 광을 팔 사람(=훈수)을 무작위로 뽑는다 */
export function pickGwangSeller(rng: () => number = Math.random): PlayerSeat {
  const pool = RULES.gwangSellerCandidates === 'all' ? SEATS : SEATS.filter((s) => !s.isHuman);
  return pool[Math.floor(rng() * pool.length)]!;
}
