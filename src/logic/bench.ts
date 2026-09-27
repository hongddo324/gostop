/**
 * AI 강도 측정 (개발용): 나(me) 자리에 전략 A, 상대 두 명에 전략 B 를 두고 N판을 돌려
 * 승률·나가리·평균 득실(점)을 잰다. `npx vitest run src/logic/bench.test.ts` 로 실행.
 */
import { dealGame, seededRng } from '../game/deal';
import { choose, declareGoStop, flipCard, playCard, resolveTurn } from '../game/engine';
import { splitSeats } from '../game/seats';
import type { GameState } from '../game/types';
import { visibleContext } from './aiContext';
import { chooseTargetAi, decideGoAi, evaluateAiMove, type Difficulty } from './aiEngine';
import { mcChooseCard, mcChooseTarget, mcDecideGo, seededMc } from './montecarlo';

export type Strategy = Difficulty | 'human-hint' | 'tajja';

export function playOne(seed: number, meStrat: Strategy, oppStrat: Strategy, observerId = 'uncle'): GameState {
  const { players, observer } = splitSeats(observerId);
  const rng = seededRng(seed);
  // 선은 판마다 돌아가며 (자리 유불리 제거)
  let s = dealGame(players, observer, rng, players[seed % 3]!.id);
  let guard = 0;
  while (s.phase !== 'end' && guard++ < 300) {
    const me = s.players[s.current]!;
    const strat = me.seat.isHuman ? meStrat : oppStrat;
    // 'human-hint' = 사람이 훈수(고급 평가)를 그대로 따르는 경우
    if (strat === 'tajja' && (s.phase === 'play' || s.phase === 'choose' || s.phase === 'goStop')) {
      const o = seededMc(seed * 131 + guard, MC_WORLDS);
      if (s.phase === 'play') s = playCard(s, mcChooseCard(s, o).id);
      else if (s.phase === 'choose') s = choose(s, mcChooseTarget(s).id);
      else s = declareGoStop(s, mcDecideGo(s, o));
      continue;
    }
    const d: Difficulty = strat === 'human-hint' || strat === 'tajja' ? 'expert' : strat;
    const v = visibleContext(s);
    if (s.phase === 'play') s = playCard(s, evaluateAiMove(v.hand, v.field, v.opponents, v.deckRemainingCount, d, v.myCaptured, rng).id);
    else if (s.phase === 'choose') s = choose(s, chooseTargetAi(s.pending!.options, v.opponents, d, v.myCaptured, rng).id);
    else if (s.phase === 'flip') s = flipCard(s);
    else if (s.phase === 'resolve') s = resolveTurn(s);
    else s = declareGoStop(s, decideGoAi({ ...v, handCount: v.hand.length }, d, rng));
  }
  return s;
}

export let MC_WORLDS = 24;
export const setWorlds = (w: number) => (MC_WORLDS = w);

export function bench(meStrat: Strategy, oppStrat: Strategy, n = 2000) {
  let win = 0;
  let nagari = 0;
  let net = 0;
  for (let seed = 1; seed <= n; seed++) {
    const s = playOne(seed, meStrat, oppStrat, ['uncle', 'grandma', 'father-in-law'][Math.floor(seed / 3) % 3]);
    const r = s.result!;
    if (!r.winnerId) {
      nagari++;
      continue;
    }
    if (r.winnerId === 'me') {
      win++;
      net += r.losers.reduce((a, l) => a + l.points, 0);
    } else {
      net -= r.losers.find((l) => l.seatId === 'me')?.points ?? 0;
    }
  }
  return { meStrat, oppStrat, winRate: +(win / n).toFixed(3), nagari: +(nagari / n).toFixed(3), avgNet: +(net / n).toFixed(2) };
}
