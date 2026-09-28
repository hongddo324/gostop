import { sortHand } from './deal';
import { RULES } from './rules';
import { applyGoBonus, scoreOf } from './scoring';
import type { GameResult, GameState, HwatuCard, Month, PlayerState, SpecialEvent, TurnReport } from './types';

/**
 * 고스톱 룰 엔진 — 불변(immutable) 상태 → 상태 전이 순수 함수.
 * UI 는 단계별로 호출하면서 사이사이 애니메이션을 넣는다.
 *
 *   play ─(같은 월 2장)→ choose ─→ flip ─(같은 월 2장)→ choose ─→ resolve ─→ goStop? ─→ 다음 차례 / end
 */

const byMonth = (cards: HwatuCard[], month: Month) => cards.filter((c) => c.month === month);
const without = (cards: HwatuCard[], remove: HwatuCard[]) => cards.filter((c) => !remove.some((r) => r.id === c.id));

export const currentPlayer = (s: GameState): PlayerState => s.players[s.current]!;

function assertPhase(s: GameState, phase: GameState['phase']) {
  if (s.phase !== phase) throw new Error(`잘못된 단계: ${s.phase} (기대: ${phase})`);
}

function updatePlayer(s: GameState, seatId: string, fn: (p: PlayerState) => PlayerState): PlayerState[] {
  return s.players.map((p) => (p.seat.id === seatId ? fn(p) : p));
}

/** 손패 1장 내기 */
export function playCard(s: GameState, cardId: string): GameState {
  assertPhase(s, 'play');
  const me = currentPlayer(s);
  const card = me.hand.find((c) => c.id === cardId);
  if (!card) throw new Error(`손패에 없는 카드: ${cardId}`);
  if (card.isBonus) return playBonus(s, card);

  const matches = byMonth(s.field, card.month);
  const next: GameState = {
    ...s,
    players: updatePlayer(s, me.seat.id, (p) => ({ ...p, hand: without(p.hand, [card]) })),
    field: [...s.field, card],
    turn: {
      bonus: s.turn.bonus,
      played: card,
      playedMatch: matches.length,
      playedTarget: matches.length === 1 ? matches[0] : undefined,
    },
  };
  if (matches.length === 2) {
    return { ...next, phase: 'choose', pending: { kind: 'play', card, options: matches } };
  }
  return { ...next, phase: 'flip' };
}

/**
 * 보너스패 내기: 바로 내 득점 패로 가져가고, 더미에서 1장을 손패로 가져온 뒤 같은 차례에 다시 낸다.
 * (더미가 비어 더 낼 패가 없으면 차례를 마친다)
 */
function playBonus(s: GameState, card: HwatuCard): GameState {
  const me = currentPlayer(s);
  const [draw, ...rest] = s.deck;
  const scoreBefore = scoreOf(me.captured).total;
  const captured = [...me.captured, card];
  const hand = sortHand([...without(me.hand, [card]), ...(draw ? [draw] : [])]);
  const next: GameState = {
    ...s,
    deck: draw ? rest : s.deck,
    players: updatePlayer(s, me.seat.id, (p) => ({ ...p, hand, captured })),
    turn: { ...s.turn, bonus: [...(s.turn.bonus ?? []), card] },
    lastReport: {
      seq: ++reportSeq,
      seatId: me.seat.id,
      captured: [card],
      specials: ['bonus'],
      stolen: [],
      scoreBefore,
      scoreAfter: scoreOf(captured).total,
      drawn: draw,
    },
  };
  if (hand.length > 0) return next; // 같은 차례에 한 장 더 낸다
  return finishTurn(next, scoreOf(captured).total);
}

/** 같은 월 2장 중 먹을 패 선택 */
export function choose(s: GameState, targetId: string): GameState {
  assertPhase(s, 'choose');
  const pending = s.pending!;
  const target = pending.options.find((c) => c.id === targetId);
  if (!target) throw new Error(`선택할 수 없는 카드: ${targetId}`);
  if (pending.kind === 'play') {
    return { ...s, pending: undefined, phase: 'flip', turn: { ...s.turn, playedTarget: target } };
  }
  return { ...s, pending: undefined, phase: 'resolve', turn: { ...s.turn, flippedTarget: target } };
}

/** 더미 맨 위 1장 뒤집기 */
export function flipCard(s: GameState): GameState {
  assertPhase(s, 'flip');
  // 뒤집은 패가 보너스패면 바로 가져가고 한 장 더 뒤집는다
  let deck = s.deck;
  const bonus: HwatuCard[] = [];
  while (deck[0]?.isBonus) {
    bonus.push(deck[0]);
    deck = deck.slice(1);
  }
  if (bonus.length > 0) {
    const me = currentPlayer(s);
    s = {
      ...s,
      deck,
      players: updatePlayer(s, me.seat.id, (p) => ({ ...p, captured: [...p.captured, ...bonus] })),
      turn: { ...s.turn, bonus: [...(s.turn.bonus ?? []), ...bonus] },
    };
  }

  const [top, ...rest] = s.deck;
  if (!top) return { ...s, phase: 'resolve' }; // 더미 소진 (보너스패로 더미를 더 쓴 경우)

  const played = s.turn.played!;
  const next: GameState = { ...s, deck: rest, field: [...s.field, top], turn: { ...s.turn, flipped: top } };
  if (top.month === played.month) return { ...next, phase: 'resolve' }; // 쪽/뻑/따닥 — resolve 에서 판정

  const matches = byMonth(s.field, top.month);
  if (matches.length === 1) return { ...next, phase: 'resolve', turn: { ...next.turn, flippedTarget: matches[0] } };
  if (matches.length === 2) {
    return { ...next, phase: 'choose', pending: { kind: 'flip', card: top, options: matches } };
  }
  return { ...next, phase: 'resolve' };
}

/** 상대 득점 패에서 피 1장 빼앗기 (일반 피 우선, 없으면 쌍피) */
function pickPiToGive(captured: HwatuCard[]): HwatuCard | undefined {
  const pis = captured.filter((c) => c.type === 'pi');
  return pis.find((c) => c.piValue === 1) ?? pis[0];
}

let reportSeq = 0;

/** 먹기 정산: 쪽/뻑/따닥/뻑 먹기/싹쓸이 + 피 빼앗기 + 고/스톱 판정 */
export function resolveTurn(s: GameState): GameState {
  assertPhase(s, 'resolve');
  const me = currentPlayer(s);
  const { played: P, flipped: F, playedMatch: m, playedTarget, flippedTarget } = s.turn;
  if (!P) throw new Error('낸 패가 없습니다');

  let field = s.field;
  let ppeokMonths = [...s.ppeokMonths];
  const captured: HwatuCard[] = [];
  const specials: SpecialEvent[] = [];

  const take = (cards: HwatuCard[]) => {
    captured.push(...cards);
    field = without(field, cards);
  };
  /** 같은 월 4장을 한 번에 먹을 때 — 뻑 더미였다면 뻑 먹기 */
  const takeStack = (month: Month) => {
    take(byMonth(field, month));
    if (ppeokMonths.includes(month)) {
      specials.push('ppeokEat');
      ppeokMonths = ppeokMonths.filter((x) => x !== month);
    }
  };

  if (F && F.month === P.month) {
    if (m === 0) {
      take([P, F]);
      specials.push('jjok');
    } else if (m === 1) {
      specials.push('ppeok'); // 3장이 바닥에 남음
      ppeokMonths.push(P.month);
    } else {
      takeStack(P.month); // m === 2: 따닥
      specials.push('ttadak');
    }
  } else {
    if (m === 3) takeStack(P.month);
    else if (m >= 1) take([P, playedTarget!]);

    if (F) {
      const fMatches = byMonth(field, F.month).filter((c) => c.id !== F.id);
      if (fMatches.length === 3) takeStack(F.month);
      else if (fMatches.length >= 1) take([F, flippedTarget!]);
    }
  }

  const lastTurn = s.players.every((p) => p.hand.length === 0);
  if (captured.length > 0 && field.length === 0 && !lastTurn) specials.push('sweep');
  const bonus = s.turn.bonus ?? [];
  if (bonus.length > 0) specials.push('bonus');

  // 피 빼앗기 (뻑·보너스는 제외)
  const stealCount = specials.filter((e) => e !== 'ppeok' && e !== 'bonus').length * RULES.stealPerSpecial;
  const stolen: TurnReport['stolen'] = [];
  let players = s.players.map((p) => {
    if (p.seat.id === me.seat.id) return p;
    let cap = p.captured;
    for (let i = 0; i < stealCount; i++) {
      const give = pickPiToGive(cap);
      if (!give) break;
      cap = without(cap, [give]);
      stolen.push({ fromSeatId: p.seat.id, card: give });
    }
    return { ...p, captured: cap };
  });

  // 이번 턴 보너스패는 이미 득점 패에 들어가 있으므로 턴 시작 시점 점수에서 뺀다
  const scoreBefore = scoreOf(without(me.captured, bonus)).total;
  const myCaptured = [...me.captured, ...captured, ...stolen.map((x) => x.card)];
  const scoreAfter = scoreOf(myCaptured).total;
  players = players.map((p) => (p.seat.id === me.seat.id ? { ...p, captured: myCaptured } : p));

  const report: TurnReport = {
    seq: ++reportSeq,
    seatId: me.seat.id,
    captured: [...bonus, ...captured],
    specials,
    stolen,
    scoreBefore,
    scoreAfter,
  };
  return finishTurn({ ...s, players, field, ppeokMonths, lastReport: report }, scoreAfter);
}

/** 턴 마무리: 고/스톱 판정(기준 점수 이상 + 마지막 고 이후 점수 상승) 또는 다음 차례 */
function finishTurn(next: GameState, scoreAfter: number): GameState {
  const meNow = currentPlayer(next);
  if (scoreAfter >= RULES.goStopMinScore && scoreAfter > meNow.goScore) {
    // 낼 패가 없으면 더 고를 불러도 의미가 없으므로 자동 스톱
    if (meNow.hand.length === 0) return endGame(next, meNow.seat.id);
    return { ...next, phase: 'goStop' };
  }
  return advance(next);
}

/** 고 / 스톱 선언 */
export function declareGoStop(s: GameState, go: boolean): GameState {
  assertPhase(s, 'goStop');
  const me = currentPlayer(s);
  if (!go) return endGame(s, me.seat.id);
  const score = scoreOf(me.captured).total;
  const next = { ...s, players: updatePlayer(s, me.seat.id, (p) => ({ ...p, goCount: p.goCount + 1, goScore: score })) };
  return advance(next);
}

/** 다음 차례로. 모두 손패를 다 냈으면 나가리 */
function advance(s: GameState): GameState {
  if (s.players.every((p) => p.hand.length === 0)) return endGame(s, null);
  return {
    ...s,
    current: (s.current + 1) % s.players.length,
    phase: 'play',
    turn: { playedMatch: 0 },
    pending: undefined,
  };
}

/** 판 종료 + 정산 (광박/피박) */
function endGame(s: GameState, winnerId: string | null): GameState {
  return { ...s, phase: 'end', pending: undefined, result: settle(s, winnerId) };
}

export function settle(s: GameState, winnerId: string | null): GameResult {
  if (!winnerId) return { winnerId: null, baseScore: 0, goCount: 0, score: 0, losers: [] };
  const winner = s.players.find((p) => p.seat.id === winnerId)!;
  const ws = scoreOf(winner.captured);
  const score = applyGoBonus(ws.total, winner.goCount);
  const losers = s.players
    .filter((p) => p.seat.id !== winnerId)
    .map((p) => {
      const ls = scoreOf(p.captured);
      const gwangBak = ws.gwang > 0 && ls.gwangCount === 0;
      const piBak = ws.pi > 0 && ls.piCount > 0 && ls.piCount <= RULES.piBakMax;
      return { seatId: p.seat.id, gwangBak, piBak, points: score * (gwangBak ? 2 : 1) * (piBak ? 2 : 1) };
    });
  return { winnerId, baseScore: ws.total, goCount: winner.goCount, score, losers };
}

/** 모든 카드 수 (무결성 검사용) */
export function totalCards(s: GameState): number {
  return s.field.length + s.deck.length + s.players.reduce((n, p) => n + p.hand.length + p.captured.length, 0);
}
