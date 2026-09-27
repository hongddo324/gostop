/**
 * 난이도별 AI 결정의 단일 진입점.
 *  - 초급(beginner)      : 짝 맞는 패 중 무작위, 고/스톱 반반
 *  - 중급(intermediate)  : 휴리스틱 평가 — 득점·족보·상대 견제·피 전략·뻑 확률 (이전 '고급')
 *  - 고급·타짜(expert)   : 몬테카를로 시뮬레이션 — 가능한 판을 수백 번 끝까지 둬 보고 돈을 가장 많이 따는 수
 */
import type { GameState, HwatuCard } from '../game/types';
import { visibleContext } from './aiContext';
import { chooseTargetAi, decideGoAi, evaluateAiMove, type Difficulty } from './aiEngine';
import { DEFAULT_MC, mcChooseCard, mcChooseTarget, mcDecideGo } from './montecarlo';


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

export function aiDecideGo(s: GameState, d: Difficulty): boolean {
  if (d === 'expert') return mcDecideGo(s, DEFAULT_MC);
  const v = visibleContext(s);
  return decideGoAi({ ...v, handCount: v.hand.length }, heuristicLevel(d));
}
