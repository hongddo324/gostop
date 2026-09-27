/**
 * 도움 모드(상세 훈수) 엔진 — aiEngine 의 expert 평가를 재활용해
 * 추천 카드와 그 이유를 사람이 읽을 수 있는 설명으로 만든다.
 *
 * detailedExplanation 은 중립적인 설명문이고, 캐릭터 말투(반말·사투리)로 바꾸는 것은
 * content/hintVoice.ts 가 reasonCode + vars 를 받아 처리한다.
 */
import { CARD_TYPE_LABEL } from '../game/cards';
import type { HwatuCard } from '../game/types';
import { josa } from '../lib/josa';
import { evaluateMoves, type MoveEvaluation, type OpponentState } from './aiEngine';

export type HintReason = 'BONUS' | 'DEFENSE' | 'COMBO' | 'PI_TEN' | 'RISK' | 'DISCARD' | 'MATCH';

export interface HintExplanation {
  recommendedCardId: string;
  actionType: 'MATCH' | 'DISCARD';
  primaryReason: string;
  detailedExplanation: string;
  scoreBreakdown: {
    gainScore: number;
    defenseScore: number;
    riskPenalty: number;
  };
  /** 말투 변환용 */
  reasonCode: HintReason;
  vars: Record<string, string | number>;
}

export interface HintInput {
  hand: HwatuCard[];
  field: HwatuCard[];
  opponents: OpponentState[];
  deckRemainingCount: number;
  myCaptured?: HwatuCard[];
}

/** 위험 회피 설명을 붙일 최소 뻑 확률 */
const RISK_NOTE_PROB = 0.12;

const typeName = (c: HwatuCard) => (c.piValue === 2 ? '쌍피' : c.piValue === 3 ? '쓰리피' : c.type === 'pi' ? '일반 피' : CARD_TYPE_LABEL[c.type]);
const round = (n: number) => Math.round(n * 10) / 10;
export function getHintExplanation(input: HintInput): HintExplanation {
  const { hand, field, opponents, deckRemainingCount, myCaptured = [] } = input;
  const evals = evaluateMoves(hand, field, opponents, deckRemainingCount, myCaptured);
  const best = evals[0]!;
  const n = best.notes;
  const card = best.card;

  const base = {
    recommendedCardId: card.id,
    actionType: best.actionType,
    scoreBreakdown: {
      gainScore: round(best.gainScore + best.comboScore + best.piScore),
      defenseScore: round(best.defenseScore),
      riskPenalty: round(best.riskPenalty),
    },
  };
  const make = (reasonCode: HintReason, primaryReason: string, detailedExplanation: string, vars: Record<string, string | number>) => ({
    ...base,
    reasonCode,
    primaryReason,
    detailedExplanation,
    vars: { card: card.name, month: card.month, ...vars },
  });

  if (card.isBonus) {
    return make('BONUS', '보너스패 먼저', '보너스패는 내는 즉시 내 것이 되고 더미에서 한 장을 더 받습니다. 무조건 먼저 내는 것이 이득입니다.', {});
  }

  if (n.blocks) {
    const { opponent, combo, month } = n.blocks;
    return make(
      'DEFENSE',
      `상대 ${combo.name} 완성 차단`,
      `${opponent.name}${josa(opponent.name, '이', '가')} ${combo.name} 완성까지 단 1장(${month}월)만 남겨두고 있습니다. 내 득점보다 상대의 핵심 패를 먼저 가로채는 것이 급선무입니다.`,
      { opponent: opponent.name, combo: combo.name, month },
    );
  }

  if (n.completesCombo) {
    const c = n.completesCombo;
    return make(
      'COMBO',
      `${c.name} 완성`,
      `이 패를 먹으면 ${c.name}(${c.points}점)${josa(c.name, '이', '가')} 즉시 완성됩니다. 가장 확실한 득점 루트입니다.`,
      { combo: c.name, points: c.points },
    );
  }

  if (n.piBefore < 10 && n.piAfter >= 10) {
    const got = [card, ...best.targets].reduce((a, b) => (b.piValue > a.piValue ? b : a)); // 가장 값진 피를 언급
    return make(
      'PI_TEN',
      '피 10장 채우기',
      `현재 내 피가 ${n.piBefore}장입니다. 이번 턴에 ${typeName(got)}를 가져와 10장을 채우면 피박을 면하고 전세를 유리하게 끌고 갈 수 있습니다.`,
      { pi: n.piBefore, piCard: typeName(got) },
    );
  }

  // 위험 회피: 위험을 빼고 보면 더 좋아 보이는 수가 뻑 위험 때문에 밀렸는지
  const byGain = (e: MoveEvaluation) => e.total + e.riskPenalty;
  const greedy = [...evals].sort((a, b) => byGain(b) - byGain(a))[0]!;
  if (greedy.card.id !== card.id && greedy.notes.ppeokProb >= RISK_NOTE_PROB && greedy.riskPenalty > 0) {
    return make(
      'RISK',
      `뻑 위험 회피`,
      `바닥에 깔린 패와 덱 카운팅 결과, ${greedy.card.name}${josa(greedy.card.name, '을', '를')} 낼 경우 뻑이 날 위험도가 높으므로 차선책인 ${card.name}${josa(card.name, '을', '를')} 추천합니다.`,
      { risky: greedy.card.name, riskyMonth: greedy.card.month },
    );
  }

  if (best.actionType === 'DISCARD') {
    const t = typeName(card);
    return make(
      'DISCARD',
      '안전한 버림패',
      `바닥에 매칭되는 짝이 없습니다. 상대방이 노리는 족보와 무관하며 점수 가치가 가장 낮은 ${card.month}월 ${t}${josa(t, '을', '를')} 버리는 것이 가장 안전합니다.`,
      { typeName: t },
    );
  }

  const target = best.targets[0]!;
  const extra = n.scoreDelta > 0 ? ` 먹으면 점수가 ${n.scoreDelta}점 오릅니다.` : '';
  return make(
    'MATCH',
    `${card.month}월 먹기`,
    `${card.name}${josa(card.name, '으로', '로')} 바닥의 ${target.name}${josa(target.name, '을', '를')} 먹는 것이 지금 가장 이득입니다.${extra}`,
    { target: target.name, delta: n.scoreDelta },
  );
}
