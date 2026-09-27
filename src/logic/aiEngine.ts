/**
 * AI 의사결정 엔진 — 기댓값 기반 휴리스틱 평가 (Heuristic Utility Evaluation)
 *
 * 고스톱은 불완전 정보 + 확률 게임이므로 몬테카를로 탐색 대신, 낼 수 있는 각 카드(Move)에 대해
 * 아래 항목의 가중치 합(score)을 계산해 최적의 수를 고른다.
 *   1) 즉각 득점 가치   gain     — 먹는 패의 가치 + 실제 점수 상승
 *   2) 족보 완성 기여도  combo    — 고도리/홍단/청단/초단/삼광 진행
 *   3) 상대 견제도      defense  — 상대가 족보 1장 전(리치)인 패를 가로채기 / 내주지 않기
 *   4) 피 전략          pi       — 피 10장 기준선, 피박 방어
 *   5) 확률적 위험도     risk     — 덱에서 같은 월이 뒤집혀 뻑(설사)이 날 확률
 *   6) 버리는 패 안전도  safety   — 짝이 없을 때 위협이 덜한 싼 패 우선
 *
 * AI 는 공개 정보(내 손패, 바닥, 모든 사람의 먹은 패, 남은 더미 장수)만 사용한다.
 */
import { createDeck } from '../game/cards';
import { RULES } from '../game/rules';
import { scoreOf } from '../game/scoring';
import type { HwatuCard, Month } from '../game/types';

export type Difficulty = 'beginner' | 'intermediate' | 'expert';

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  beginner: '초급',
  intermediate: '중급',
  expert: '고급·타짜',
};

export interface OpponentState {
  id: string;
  name: string;
  captured: HwatuCard[];
  score: number;
}

/** 족보 정의 — 상대 리치(1장 남음) 감지와 내 족보 진행 평가에 공통 사용 */
export interface ComboDef {
  key: string;
  name: string;
  points: number;
  need: number;
  member: (c: HwatuCard) => boolean;
}
export const COMBOS: ComboDef[] = [
  { key: 'godori', name: '고도리', points: 5, need: 3, member: (c) => !!c.isGodori },
  { key: 'hong', name: '홍단', points: 3, need: 3, member: (c) => c.ribbon === 'hong' },
  { key: 'cheong', name: '청단', points: 3, need: 3, member: (c) => c.ribbon === 'cheong' },
  { key: 'cho', name: '초단', points: 3, need: 3, member: (c) => c.ribbon === 'cho' },
  { key: 'gwang', name: '삼광', points: 3, need: 3, member: (c) => c.type === 'gwang' },
];

/** 가중치 — 튜닝 포인트를 한 곳에 */
export const WEIGHTS = {
  scoreGain: 30, // 실제 점수 1점 상승
  comboStep: 6, // 족보 멤버 1장 추가 (이미 1장 이상 보유 시)
  defenseBlock: 100, // 상대 리치 패 가로채기
  defenseFeed: 60, // 상대 리치 패를 바닥에 버려 내주기 (감점)
  piTen: 25, // 피 10장 기준선 돌파
  piBakGuard: 8, // 피박 위험 구간에서 피 확보
  ppeokRisk: 45, // 뻑 확률 × 가중치 (감점)
  jjokChance: 12, // 쪽 확률 × 가중치
  deadMonthSafe: 8, // 남은 같은 월이 없는(아무도 못 먹는) 패 버리기
};

/** 카드 가치: 광 > 열끗 > 띠 > 쌍피 > 단피 */
export function cardValue(c: HwatuCard): number {
  switch (c.type) {
    case 'gwang':
      return c.isBonus ? 12 : c.isBiGwang ? 14 : 20;
    case 'yeol':
      return c.isGodori ? 13 : 10;
    case 'tti':
      return c.ribbon === 'plain' ? 5 : 8;
    case 'pi':
      return c.piValue * 4;
  }
}

export interface MoveEvaluation {
  card: HwatuCard;
  actionType: 'MATCH' | 'DISCARD';
  /** 같이 먹게 될 바닥 패 (같은 월 2장이면 더 좋은 쪽) */
  targets: HwatuCard[];
  gainScore: number;
  comboScore: number;
  defenseScore: number;
  piScore: number;
  riskPenalty: number;
  safetyScore: number;
  total: number;
  /** 설명 생성용 근거 */
  notes: {
    scoreDelta: number;
    completesCombo?: ComboDef;
    blocks?: { opponent: OpponentState; combo: ComboDef; month: Month };
    feeds?: { opponent: OpponentState; combo: ComboDef; month: Month };
    piBefore: number;
    piAfter: number;
    ppeokProb: number;
    /** 아직 안 보인(더미·상대 손패) 같은 월 장수 */
    sameUnseen: number;
  };
}

/** 상대가 족보 완성까지 1장 남은(리치) 상황 — 부족한 1장이 속할 수 있는 월 목록과 함께 */
export interface Threat {
  opponent: OpponentState;
  combo: ComboDef;
  missing: HwatuCard[];
}

const ALL = createDeck();

export function findThreats(opponents: OpponentState[], myCaptured: HwatuCard[] = []): Threat[] {
  const taken = new Set([...opponents.flatMap((o) => o.captured), ...myCaptured].map((c) => c.id));
  const out: Threat[] = [];
  for (const o of opponents) {
    for (const combo of COMBOS) {
      const have = o.captured.filter(combo.member).length;
      if (have !== combo.need - 1) continue;
      const missing = ALL.filter((c) => combo.member(c) && !taken.has(c.id));
      if (missing.length > 0) out.push({ opponent: o, combo, missing });
    }
  }
  return out;
}

/** 아직 보이지 않은 카드(더미 + 상대 손패) 중 해당 월 장수 */
function unseenOfMonth(month: Month, seen: Set<string>): number {
  return ALL.filter((c) => c.month === month && !seen.has(c.id)).length;
}

function comboProgress(before: HwatuCard[], gained: HwatuCard[]): { score: number; completes?: ComboDef } {
  let score = 0;
  let completes: ComboDef | undefined;
  for (const combo of COMBOS) {
    const had = before.filter(combo.member).length;
    const add = gained.filter(combo.member).length;
    if (add === 0 || had >= combo.need) continue;
    if (had + add >= combo.need) completes = completes ?? combo;
    else if (had + add >= 2) score += WEIGHTS.comboStep * add;
  }
  return { score, completes };
}

/**
 * 모든 수를 전문가(expert) 기준으로 평가해 점수 내림차순으로 반환.
 * difficulty 에 따라 사용하는 항목만 다르게 선택한다(evaluateAiMove 참고).
 */
export function evaluateMoves(
  hand: HwatuCard[],
  field: HwatuCard[],
  opponents: OpponentState[],
  deckRemainingCount: number,
  myCaptured: HwatuCard[] = [],
): MoveEvaluation[] {
  const seen = new Set([...hand, ...field, ...myCaptured, ...opponents.flatMap((o) => o.captured)].map((c) => c.id));
  const unseenTotal = Math.max(1, ALL.length - seen.size);
  const threats = findThreats(opponents, myCaptured);
  const scoreBefore = scoreOf(myCaptured).total;
  const piBefore = scoreOf(myCaptured).piCount;

  return hand
    .map((card): MoveEvaluation => {
      // 보너스패는 공짜 — 항상 최우선
      if (card.isBonus) {
        const piAfter = piBefore + card.piValue;
        return {
          card,
          actionType: 'MATCH',
          targets: [],
          gainScore: 200,
          comboScore: 0,
          defenseScore: 0,
          piScore: 0,
          riskPenalty: 0,
          safetyScore: 0,
          total: 200,
          notes: { scoreDelta: scoreOf([...myCaptured, card]).total - scoreBefore, piBefore, piAfter, ppeokProb: 0, sameUnseen: 0 },
        };
      }

      const matches = field.filter((f) => f.month === card.month);
      const m = matches.length;
      const targets =
        m === 0 ? [] : m === 2 ? [matches.reduce((a, b) => (cardValue(b) > cardValue(a) ? b : a))] : matches;
      const gained = m === 0 ? [] : [card, ...targets];

      // 1) 즉각 득점
      const scoreDelta = scoreOf([...myCaptured, ...gained]).total - scoreBefore;
      const gainScore = gained.reduce((s, c) => s + cardValue(c), 0) + scoreDelta * WEIGHTS.scoreGain;

      // 2) 족보 진행
      const combo = comboProgress(myCaptured, gained);

      // 3) 견제: 상대 리치 패를 가로채면 +, 바닥에 버려 내주면 -
      let defenseScore = 0;
      let blocks: MoveEvaluation['notes']['blocks'];
      let feeds: MoveEvaluation['notes']['feeds'];
      for (const t of threats) {
        const blocked = gained.find((g) => t.missing.some((x) => x.id === g.id));
        if (blocked) {
          defenseScore += WEIGHTS.defenseBlock;
          blocks = blocks ?? { opponent: t.opponent, combo: t.combo, month: blocked.month };
        } else if (m === 0 && t.missing.some((x) => x.id === card.id)) {
          defenseScore -= WEIGHTS.defenseFeed;
          feeds = feeds ?? { opponent: t.opponent, combo: t.combo, month: card.month };
        }
      }

      // 4) 피 전략: 10장 기준선 돌파, 피박 위험 구간 방어
      const piAfter = piBefore + gained.reduce((s, c) => s + c.piValue, 0);
      let piScore = 0;
      if (piBefore < 10 && piAfter >= 10) piScore += WEIGHTS.piTen;
      if (piBefore <= RULES.piBakMax && piAfter > piBefore) piScore += WEIGHTS.piBakGuard;

      // 5) 확률적 위험: 1장 짝에 내면, 더미에서 같은 월이 뒤집히면 뻑
      const sameUnseen = unseenOfMonth(card.month, seen);
      const flipProb = deckRemainingCount > 0 ? sameUnseen / unseenTotal : 0;
      let riskPenalty = 0;
      if (m === 1) riskPenalty = flipProb * WEIGHTS.ppeokRisk;
      else if (m === 0) riskPenalty = -flipProb * WEIGHTS.jjokChance; // 쪽 기회는 가점(음수 감점)

      // 6) 버림패 안전도: 싼 패, 아무도 못 먹는 월(남은 장수 0) 우선
      let safetyScore = 0;
      if (m === 0) {
        safetyScore = -cardValue(card);
        if (sameUnseen === 0) safetyScore += WEIGHTS.deadMonthSafe;
      }

      const total = gainScore + combo.score + defenseScore + piScore - riskPenalty + safetyScore;
      return {
        card,
        actionType: m === 0 ? 'DISCARD' : 'MATCH',
        targets,
        gainScore,
        comboScore: combo.score,
        defenseScore,
        piScore,
        riskPenalty,
        safetyScore,
        total,
        notes: { scoreDelta, completesCombo: combo.completes, blocks, feeds, piBefore, piAfter, ppeokProb: flipProb, sameUnseen },
      };
    })
    .sort((a, b) => b.total - a.total);
}

/**
 * 난이도별 낼 패 선택.
 *  - beginner    : 짝이 있는 패 중 무작위, 없으면 아무 패나 무작위
 *  - intermediate: 내 득점만 보는 탐욕 (광 > 열끗 > 띠 > 쌍피 > 단피), 견제·확률 무시
 *  - expert      : 견제 + 족보 + 피 전략 + 뻑 확률 + 버림패 안전도 전부
 */
export function evaluateAiMove(
  hand: HwatuCard[],
  field: HwatuCard[],
  opponentStates: OpponentState[],
  deckRemainingCount: number,
  difficulty: Difficulty,
  myCaptured: HwatuCard[] = [],
  rng: () => number = Math.random,
): HwatuCard {
  const bonus = hand.find((c) => c.isBonus);
  if (bonus) return bonus; // 보너스패는 난이도와 무관하게 먼저

  if (difficulty === 'beginner') {
    const matching = hand.filter((c) => field.some((f) => f.month === c.month));
    const pool = matching.length > 0 ? matching : hand;
    return pool[Math.floor(rng() * pool.length)]!;
  }

  const evals = evaluateMoves(hand, field, opponentStates, deckRemainingCount, myCaptured);
  if (difficulty === 'intermediate') {
    const greedy = (e: MoveEvaluation) => e.gainScore + (e.actionType === 'DISCARD' ? -cardValue(e.card) : 0);
    return [...evals].sort((a, b) => greedy(b) - greedy(a))[0]!.card;
  }
  return evals[0]!.card;
}

/** 같은 월 2장 중 먹을 패 선택 */
export function chooseTargetAi(
  options: HwatuCard[],
  opponents: OpponentState[],
  difficulty: Difficulty,
  myCaptured: HwatuCard[] = [],
  rng: () => number = Math.random,
): HwatuCard {
  if (difficulty === 'beginner') return options[Math.floor(rng() * options.length)]!;
  const threatIds =
    difficulty === 'expert' ? new Set(findThreats(opponents, myCaptured).flatMap((t) => t.missing.map((c) => c.id))) : new Set();
  const v = (c: HwatuCard) => cardValue(c) + (threatIds.has(c.id) ? WEIGHTS.defenseBlock : 0);
  return options.reduce((a, b) => (v(b) > v(a) ? b : a));
}

/**
 * 고/스톱 판단.
 *  - beginner    : 50% 확률
 *  - intermediate: 1고는 안전하게 시도하고 이후 스톱
 *  - expert      : 상대 점수·리치 위협, 남은 손패, 피박 역전 위험을 종합해 냉정하게
 */
export function decideGoAi(
  ctx: { myScore: number; goCount: number; handCount: number; myCaptured: HwatuCard[]; opponents: OpponentState[] },
  difficulty: Difficulty,
  rng: () => number = Math.random,
): boolean {
  if (difficulty === 'beginner') return rng() < 0.5;
  if (difficulty === 'intermediate') return ctx.goCount === 0 && ctx.handCount >= 2;

  if (ctx.handCount <= 1) return false;
  const maxOpp = Math.max(0, ...ctx.opponents.map((o) => o.score));
  const threats = findThreats(ctx.opponents, ctx.myCaptured).length;
  const myPi = scoreOf(ctx.myCaptured).piCount;
  // 상대가 곧 날 수 있거나(2점 이상/리치), 내 피가 적어 역전 시 피박 위험이 크면 스톱
  if (maxOpp >= 2 || threats > 0) return false;
  if (myPi <= RULES.piBakMax && ctx.handCount <= 3) return false;
  // 손패가 넉넉하고 점수를 더 불릴 여지가 있으면 고 (3고 이상은 욕심 금물)
  return ctx.handCount >= 3 && ctx.goCount < 2;
}
