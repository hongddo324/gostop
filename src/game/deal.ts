import { createDeck } from './cards';
import type { GameState, HwatuCard, PlayerSeat } from './types';

export const HAND_SIZE = 7;
export const FIELD_SIZE = 6;
export const PLAYER_COUNT = 3;

export type Rng = () => number;

/** Fisher–Yates 셔플. 원본 배열은 변경하지 않는다. rng 주입으로 테스트/리플레이 재현 가능. */
export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/** 시드 기반 난수 (mulberry32) — 디버깅/리플레이용 */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 3인 고스톱 분배: 플레이어당 7장, 바닥 6장, 나머지 21장은 더미.
 * 실제 화투 분배 순서(4-3-3 등)는 연출 단계에서 처리하고, 여기서는 결과만 계산한다.
 */
export function dealGame(
  players: readonly PlayerSeat[],
  observer: PlayerSeat,
  rng: Rng = Math.random,
): GameState {
  if (players.length !== PLAYER_COUNT) {
    throw new Error(`3인 플레이만 지원합니다. (입력: ${players.length}명)`);
  }

  const deck: HwatuCard[] = shuffle(createDeck(), rng);
  let cursor = 0;
  const take = (n: number) => {
    const out = deck.slice(cursor, cursor + n);
    cursor += n;
    return out;
  };

  const playerStates = players.map((seat) => ({ seat, hand: sortHand(take(HAND_SIZE)), captured: [] }));
  const field = take(FIELD_SIZE);

  return { players: playerStates, observer, field, deck: deck.slice(cursor) };
}

/** 손패 정렬: 월 오름차순 → 광/열끗/띠/피 순 */
const TYPE_ORDER = { gwang: 0, yeol: 1, tti: 2, pi: 3 } as const;
export function sortHand(cards: HwatuCard[]): HwatuCard[] {
  return [...cards].sort((a, b) => a.month - b.month || TYPE_ORDER[a.type] - TYPE_ORDER[b.type]);
}
