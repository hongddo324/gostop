import { currentPlayer } from './engine';
import { scoreOf } from './scoring';
import type { GameState, HwatuCard } from './types';

/** 카드 가치 (AI 판단용 휴리스틱) */
export function cardValue(c: HwatuCard): number {
  switch (c.type) {
    case 'gwang':
      return c.isBiGwang ? 14 : 20;
    case 'yeol':
      return c.isGodori ? 12 : 8;
    case 'tti':
      return c.ribbon === 'plain' ? 5 : 7;
    case 'pi':
      return c.piValue * 3;
  }
}

/**
 * AI 손패 선택: 먹을 수 있으면 가장 값진 쌍을, 못 먹으면 가장 싼 패를 버린다.
 * 바닥 3장(뻑 포함)을 한 번에 먹을 수 있으면 최우선.
 */
export function aiChooseCard(s: GameState, hand = currentPlayer(s).hand): HwatuCard {
  let best = hand[0]!;
  let bestScore = -Infinity;
  const bonus = hand.find((c) => c.isBonus);
  if (bonus) return bonus; // 보너스패는 공짜 — 무조건 먼저
  for (const c of hand) {
    const matches = s.field.filter((f) => f.month === c.month);
    let v: number;
    if (matches.length === 3) v = 100;
    else if (matches.length > 0) v = 30 + cardValue(c) + Math.max(...matches.map(cardValue));
    else v = -cardValue(c);
    if (v > bestScore) {
      bestScore = v;
      best = c;
    }
  }
  return best;
}

/** 같은 월 2장 중 선택: 더 값진 패 */
export function aiChooseTarget(options: HwatuCard[]): HwatuCard {
  return options.reduce((a, b) => (cardValue(b) > cardValue(a) ? b : a));
}

/**
 * 고/스톱: 남은 손패가 넉넉하고 점수가 아직 낮으면 고, 아니면 스톱.
 * 상대 중 점수가 높은 사람이 있으면(역전 위험) 스톱.
 */
export function aiDecideGo(s: GameState): boolean {
  const me = currentPlayer(s);
  const myScore = scoreOf(me.captured).total;
  const threat = Math.max(...s.players.filter((p) => p !== me).map((p) => scoreOf(p.captured).total));
  return me.hand.length >= 3 && myScore < 7 && me.goCount < 2 && threat < 3;
}
