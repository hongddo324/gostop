/**
 * 타짜(고급) AI — 몬테카를로 시뮬레이션 (PIMC: Perfect Information Monte Carlo)
 *
 * 고스톱은 상대 손패와 더미 순서를 모르는 불완전 정보 게임이다. 그래서
 *  1) 보이지 않는 카드(상대 손패 + 더미)를 무작위로 채운 '가능한 세계'를 여러 개 만들고
 *  2) 각 후보 수(낼 패 / 고·스톱)를 그 세계들에서 판 끝까지 빠르게 둬 본 뒤(rollout)
 *  3) 내가 얻는 평균 금액(점수 × 박, 승리 시 +, 패배 시 −)이 가장 큰 수를 고른다.
 * 모든 후보가 같은 세계 집합을 공유해(공통 난수) 비교가 공정하다.
 * 판단에는 '볼 수 있는 정보'만 쓴다 — 실제 상대 손패와 더미 순서는 무작위로 다시 섞는다.
 */
import { createDeck } from '../game/cards';
import { shuffle, seededRng, type Rng } from '../game/deal';
import { choose, currentPlayer, declareGoStop, flipCard, playCard, resolveTurn } from '../game/engine';
import { scoreOf } from '../game/scoring';
import type { GameState, HwatuCard } from '../game/types';
import { cardValue, evaluateMoves, findThreats } from './aiEngine';
import { visibleContext } from './aiContext';

const ALL = createDeck();

export interface McOptions {
  /** 후보 수당 시뮬레이션 횟수 */
  worlds: number;
  /** 한 번의 판단에 쓸 최대 시간(ms) — 느린 폰에서도 멈춰 보이지 않게 */
  budgetMs: number;
  rng: Rng;
}
/** 300번 시뮬레이션(벤치마크상 초급 상대 평균 +1.9점, 이전 고급 상대 +1.9점), 느린 폰을 위해 최대 450ms */
export const DEFAULT_MC: McOptions = { worlds: 300, budgetMs: 450, rng: Math.random };

/** 관찰자(seatId) 입장에서 보이지 않는 카드를 무작위로 다시 배치한 세계 */
function determinize(s: GameState, seatId: string, rng: Rng): GameState {
  const me = s.players.find((p) => p.seat.id === seatId)!;
  const seen = new Set<string>([
    ...me.hand.map((c) => c.id),
    ...s.field.map((c) => c.id),
    ...s.players.flatMap((p) => p.captured.map((c) => c.id)),
  ]);
  const unseen = shuffle(
    ALL.filter((c) => !seen.has(c.id)),
    rng,
  );
  let k = 0;
  const take = (n: number) => unseen.slice(k, (k += n));
  const players = s.players.map((p) => (p.seat.id === seatId ? p : { ...p, hand: take(p.hand.length) }));
  return { ...s, players, deck: take(s.deck.length) };
}

/** 롤아웃용 빠른 정책: 먹을 수 있으면 가장 값진 쌍, 아니면 가장 싼 패 (보너스 우선) */
function fastPick(s: GameState): HwatuCard {
  const hand = currentPlayer(s).hand;
  let best = hand[0]!;
  let bestV = -Infinity;
  for (const c of hand) {
    if (c.isBonus) return c;
    const m = s.field.filter((f) => f.month === c.month);
    const v = m.length === 3 ? 90 : m.length > 0 ? 30 + cardValue(c) + Math.max(...m.map(cardValue)) : -cardValue(c);
    if (v > bestV) {
      bestV = v;
      best = c;
    }
  }
  return best;
}

/** 판 끝까지 빠르게 진행 */
function rollout(s: GameState): GameState {
  let g = 0;
  while (s.phase !== 'end' && g++ < 400) {
    switch (s.phase) {
      case 'play':
        s = playCard(s, fastPick(s).id);
        break;
      case 'choose':
        s = choose(s, s.pending!.options.reduce((a, b) => (cardValue(b) > cardValue(a) ? b : a)).id);
        break;
      case 'flip':
        s = flipCard(s);
        break;
      case 'resolve':
        s = resolveTurn(s);
        break;
      case 'goStop': {
        const p = currentPlayer(s);
        // 롤아웃 속 고/스톱: 손패가 넉넉하면 한 번쯤 고
        s = declareGoStop(s, p.goCount === 0 && p.hand.length >= 4);
        break;
      }
    }
  }
  return s;
}

/** 판 결과에서 seatId 가 얻는 금액(점) */
function payoff(s: GameState, seatId: string): number {
  const r = s.result;
  if (!r || !r.winnerId) return 0;
  if (r.winnerId === seatId) return r.losers.reduce((a, l) => a + l.points, 0);
  return -(r.losers.find((l) => l.seatId === seatId)?.points ?? 0);
}

/** 후보 행동들을 같은 세계 집합에서 롤아웃해 평균 금액을 구한다 */
function evaluateActions<T>(
  s: GameState,
  seatId: string,
  actions: T[],
  apply: (world: GameState, a: T) => GameState,
  opts: McOptions,
): number[] {
  const sums = actions.map(() => 0);
  const start = performance.now();
  let n = 0;
  for (let w = 0; w < opts.worlds; w++) {
    const world = determinize(s, seatId, opts.rng);
    actions.forEach((a, i) => {
      sums[i]! += payoff(rollout(apply(world, a)), seatId);
    });
    n++;
    if (performance.now() - start > opts.budgetMs && n >= 8) break;
  }
  return sums.map((v) => v / n);
}

/**
 * 낼 패 선택 (현재 차례 플레이어).
 * 평균 금액이 비슷하면(0.15점 이내) 휴리스틱 평가가 높은 쪽 — 견제·족보 같은 장기 가치를 반영.
 */
export function mcChooseCard(s: GameState, opts: McOptions = DEFAULT_MC): HwatuCard {
  const me = currentPlayer(s);
  const bonus = me.hand.find((c) => c.isBonus);
  if (bonus) return bonus;
  if (me.hand.length === 1) return me.hand[0]!;

  const v = visibleContext(s, me);
  const heur = new Map(evaluateMoves(v.hand, v.field, v.opponents, v.deckRemainingCount, v.myCaptured).map((e) => [e.card.id, e.total]));
  const cards = me.hand;
  const ev = evaluateActions(s, me.seat.id, cards, (world, c) => playCard(world, c.id), opts);

  let bi = 0;
  cards.forEach((c, i) => {
    const d = ev[i]! - ev[bi]!;
    if (d > 0.15 || (Math.abs(d) <= 0.15 && heur.get(c.id)! > heur.get(cards[bi]!.id)!)) bi = i;
  });
  return cards[bi]!;
}

/** 고/스톱: 지금 멈췄을 때 금액 vs 고 했을 때의 기대 금액 */
export function mcDecideGo(s: GameState, opts: McOptions = DEFAULT_MC): boolean {
  const me = currentPlayer(s);
  if (me.hand.length === 0) return false;
  const [stop, go] = evaluateActions(s, me.seat.id, [false, true], (world, g) => declareGoStop(world, g), opts);
  // 고는 되돌릴 수 없으니 조금 더 확실할 때만
  return go! > stop! + 0.4;
}

/** 같은 월 2장 중 선택: 상대 리치 패 우선, 아니면 값진 패 */
export function mcChooseTarget(s: GameState): HwatuCard {
  const v = visibleContext(s);
  const threat = new Set(findThreats(v.opponents, v.myCaptured).flatMap((t) => t.missing.map((c) => c.id)));
  const val = (c: HwatuCard) => cardValue(c) + (threat.has(c.id) ? 100 : 0) + (scoreOf([...v.myCaptured, c]).total - v.myScore) * 30;
  return s.pending!.options.reduce((a, b) => (val(b) > val(a) ? b : a));
}

/** 테스트/벤치용 시드 고정 옵션 */
export const seededMc = (seed: number, worlds = 36): McOptions => ({ worlds, budgetMs: 1e9, rng: seededRng(seed) });
