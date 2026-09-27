import type { PlayerSeat } from './types';

/** 거실 좌석 배치. 나는 항상 하단(bottom). */
export const SEATS: readonly PlayerSeat[] = [
  { id: 'me', name: '나', position: 'bottom', isHuman: true },
  { id: 'grandma', name: '외할머니', position: 'left', isHuman: false },
  { id: 'father-in-law', name: '장인어른', position: 'top', isHuman: false },
  { id: 'uncle', name: '이모부님', position: 'right', isHuman: false },
];

/** 참관(훈수) 좌석을 제외한 3명의 플레이어와 참관자를 분리 */
export function splitSeats(observerId: string): { players: PlayerSeat[]; observer: PlayerSeat } {
  const observer = SEATS.find((s) => s.id === observerId);
  if (!observer || observer.isHuman) {
    throw new Error(`참관자로 지정할 수 없는 좌석입니다: ${observerId}`);
  }
  return { players: SEATS.filter((s) => s.id !== observerId), observer };
}
