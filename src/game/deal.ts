import { createDeck } from './cards';
import type { GameState, HwatuCard, PlayerSeat, SeatPosition } from './types';

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

/** 턴 순서: 반시계 방향 (위에서 내려다봤을 때 나 → 오른쪽 → 위 → 왼쪽) */
export const TURN_ORDER: readonly SeatPosition[] = ['bottom', 'right', 'top', 'left'];

/** 바닥에 같은 월 4장이 깔리면 재분배 (한 번에 먹을 수 없어 판이 성립하지 않음) */
function fieldHasFourOfMonth(field: HwatuCard[]): boolean {
  const count = new Map<number, number>();
  for (const c of field) count.set(c.month, (count.get(c.month) ?? 0) + 1);
  return [...count.values()].some((n) => n >= 4);
}

/**
 * 3인 고스톱 분배: 플레이어당 7장, 바닥 6장, 나머지 23장(보너스 2장 포함)은 더미.
 * 바닥에 보너스패가 깔리면 선(첫 차례)이 가져가고 더미에서 1장을 채운다.
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
  const ordered = [...players].sort((a, b) => TURN_ORDER.indexOf(a.position) - TURN_ORDER.indexOf(b.position));

  for (let attempt = 0; ; attempt++) {
    const deck: HwatuCard[] = shuffle(createDeck(), rng);
    let cursor = 0;
    const take = (n: number) => {
      const out = deck.slice(cursor, cursor + n);
      cursor += n;
      return out;
    };
    const playerStates = ordered.map((seat) => ({
      seat,
      hand: sortHand(take(HAND_SIZE)),
      captured: [] as HwatuCard[],
      goCount: 0,
      goScore: 0,
    }));
    let field = take(FIELD_SIZE);
    // 바닥의 보너스패 → 선이 가져가고 더미에서 보충 (보충한 패가 또 보너스면 반복)
    while (field.some((c) => c.isBonus) && cursor < deck.length) {
      const bonus = field.filter((c) => c.isBonus);
      playerStates[0]!.captured.push(...bonus);
      field = [...field.filter((c) => !c.isBonus), ...take(bonus.length)];
    }
    if (fieldHasFourOfMonth(field) && attempt < 100) continue;

    return {
      players: playerStates,
      observer,
      field,
      deck: deck.slice(cursor),
      current: 0,
      phase: 'play',
      turn: { playedMatch: 0 },
      ppeokMonths: [],
    };
  }
}

/** 손패 정렬: 월 오름차순 → 광/열끗/띠/피 순 */
const TYPE_ORDER = { gwang: 0, yeol: 1, tti: 2, pi: 3 } as const;
export function sortHand(cards: HwatuCard[]): HwatuCard[] {
  // 보너스패는 맨 앞 (먼저 내는 패)
  const key = (c: HwatuCard) => (c.isBonus ? 0 : c.month);
  return [...cards].sort((a, b) => key(a) - key(b) || TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || a.id.localeCompare(b.id));
}
