/**
 * 난이도별 AI 결정의 단일 진입점.
 *  - 초급(beginner)      : 짝 맞는 패 중 무작위, 고/스톱 반반
 *  (고/스톱은 난이도마다 계산 결과를 '고 확률'로 바꿔 사람처럼 가끔 배짱 고도 부른다 — goProbability)
 *  - 중급(intermediate)  : 휴리스틱 평가 — 득점·족보·상대 견제·피 전략·뻑 확률 (이전 '고급')
 *  - 고급·타짜(expert)   : 몬테카를로 시뮬레이션 — 가능한 판을 수백 번 끝까지 둬 보고 돈을 가장 많이 따는 수
 */
import type { GameState, HwatuCard } from '../game/types';
import { visibleContext } from './aiContext';
import { chooseTargetAi, decideGoAi, evaluateAiMove, findThreats, type Difficulty } from './aiEngine';
import { DEFAULT_MC, mcChooseCard, mcChooseTarget, mcGoStopEv } from './montecarlo';


/** 엔진 난이도 → 휴리스틱 난이도 (중급은 이전 '고급' 휴리스틱을 쓴다) */
const heuristicLevel = (d: Difficulty): Difficulty => (d === 'intermediate' ? 'expert' : 'beginner');

export function aiPickCard(s: GameState, d: Difficulty): HwatuCard {
  if (d === 'expert') return mcChooseCard(s, DEFAULT_MC);
  const v = visibleContext(s);
  return evaluateAiMove(v.hand, v.field, v.opponents, v.deckRemainingCount, heuristicLevel(d), v.myCaptured);
}

export function aiPickTarget(s: GameState, d: Difficulty): HwatuCard {
  if (d === 'expert') return mcChooseTarget(s);
  const v = visibleContext(s);
  return chooseTargetAi(s.pending!.options, v.opponents, heuristicLevel(d), v.myCaptured);
}

/**
 * 고 / 스톱 — 3점이 났다고 늘 바로 스톱하지 않고, 사람처럼 상황에 따라 '확률로' 고를 부른다.
 * 계산(휴리스틱·몬테카를로)은 어느 쪽이 나은지를 정하고, goProbability 가 그걸 고 확률로 바꾼다.
 */
export function aiDecideGo(s: GameState, d: Difficulty, rng: () => number = Math.random): boolean {
  const v = visibleContext(s);
  const maxOpp = Math.max(0, ...v.opponents.map((o) => o.score));
  const info: GoInfo = {
    handCount: v.hand.length,
    goCount: v.goCount,
    // 상대가 곧 날 것 같지 않음 (리치 족보 없음 + 2점 미만)
    safe: maxOpp < 2 && findThreats(v.opponents, v.myCaptured).length === 0,
  };
  if (d === 'expert') {
    const ev = mcGoStopEv(s, DEFAULT_MC);
    if (!ev) return false;
    info.evDiff = ev.go - ev.stop;
  } else if (d === 'intermediate') {
    info.recommendGo = decideGoAi({ ...v, handCount: v.hand.length }, heuristicLevel(d));
  }
  return rng() < goProbability(d, info);
}

export interface GoInfo {
  handCount: number;
  goCount: number;
  safe: boolean;
  /** 고급·타짜: 몬테카를로 기대 금액 차이 (고 − 스톱, 점) */
  evDiff?: number;
  /** 중급: 휴리스틱이 고를 권하는지 */
  recommendGo?: boolean;
}

/**
 * 고를 부를 확률 (0~1).
 *  - 낼 패가 없으면 0
 *  - 초급      : 반반
 *  - 중급      : 휴리스틱이 권하면 85%, 아니면 배짱 — 상대가 안전하면 45%, 위험하면 20%
 *  - 고급·타짜 : 몬테카를로로 고가 확실히 이득이면 95%, 애매하거나 손해면 기대 금액 차이를 로지스틱으로 — 가끔 배짱
 *  마지막 1장만 남았거나 이미 2고 이상 불렀으면 욕심을 줄인다.
 */
export function goProbability(d: Difficulty, g: GoInfo): number {
  if (g.handCount <= 0) return 0;
  let p: number;
  if (d === 'beginner') p = 0.5;
  else if (d === 'intermediate') p = g.recommendGo ? 0.85 : g.safe ? 0.45 : 0.2;
  else {
    const diff = g.evDiff ?? 0;
    // 계산상 고가 확실히 이득(0.4점 초과)이면 거의 고 — 타짜 실력은 유지하고, 애매하거나 손해일 때만 확률로 배짱
    p = diff > 0.4 ? 0.95 : 1 / (1 + Math.exp(-(diff + GO_BIAS) / GO_TEMPERATURE));
    p = Math.min(0.95, Math.max(g.safe ? 0.15 : 0.05, p));
  }
  if (g.handCount === 1) p *= 0.5;
  if (g.goCount >= 2) p *= 0.7;
  return p;
}

/** 기대 금액이 같아도 고 확률 ≈ 59% (배짱), 1점 손해면 ≈ 30% */
const GO_BIAS = 0.3;
const GO_TEMPERATURE = 0.8;
