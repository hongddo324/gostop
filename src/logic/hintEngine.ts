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
import { COMBOS, cardValue, evaluateMoves, type MoveEvaluation, type OpponentState } from './aiEngine';

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
  /** 왜 이 수가 유리한지 — 근거 목록 (훈수 듣기 상세 패널) */
  reasons: string[];
  /** 다른 선택지와 비교 (추천 제외 상위 2개) */
  alternatives: { cardName: string; actionType: 'MATCH' | 'DISCARD'; total: number; gap: number; why: string }[];
  /** 추천 수 평가 총점 */
  total: number;
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

const typeName = (c: HwatuCard) => (c.piValue === 2 ? '쌍피' : c.type === 'pi' ? '일반 피' : CARD_TYPE_LABEL[c.type]);
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
  const reasons = explainWhy(best, myCaptured);
  const alternatives = evals.slice(1, 3).map((e) => ({
    cardName: e.card.name,
    actionType: e.actionType,
    total: round(e.total),
    gap: round(best.total - e.total),
    why: weakness(e, best),
  }));
  const make = (reasonCode: HintReason, primaryReason: string, detailedExplanation: string, vars: Record<string, string | number>) => ({
    ...base,
    reasons,
    alternatives,
    total: round(best.total),
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

const pct = (p: number) => `${Math.round(p * 100)}%`;
const piName = (c: HwatuCard) => (c.piValue === 2 ? '쌍피' : c.type === 'pi' ? '피' : CARD_TYPE_LABEL[c.type]);

/** 추천 수가 왜 유리한지 근거를 사람 말로 */
function explainWhy(e: MoveEvaluation, myCaptured: HwatuCard[]): string[] {
  const n = e.notes;
  const out: string[] = [];
  if (e.card.isBonus) {
    out.push('보너스패는 내는 즉시 내 득점 패가 되고(피 2장 값), 더미에서 한 장을 더 받아 같은 차례에 한 번 더 냅니다. 손해 볼 일이 전혀 없습니다.');
    return out;
  }
  const gained = e.actionType === 'MATCH' ? [e.card, ...e.targets] : [];

  if (n.blocks) {
    out.push(
      `상대 견제: ${n.blocks.opponent.name}${josa(n.blocks.opponent.name, '이', '가')} ${n.blocks.combo.name}(${n.blocks.combo.points}점)까지 1장 남았는데, 그 1장(${n.blocks.month}월)을 내가 먼저 가져오면 완성이 영영 막힙니다.`,
    );
  }
  if (gained.length > 0) {
    const names = e.targets.map((t) => t.name).join(', ');
    out.push(`바닥의 ${names}${josa(names, '을', '를')} 먹어 ${gained.map(piName).join('·')} ${gained.length}장을 가져옵니다.`);
  }
  if (n.scoreDelta > 0) out.push(`먹으면 내 점수가 바로 ${n.scoreDelta}점 오릅니다. 3점부터 고/스톱을 부를 수 있습니다.`);
  if (n.completesCombo) {
    out.push(`${n.completesCombo.name}${josa(n.completesCombo.name, '이', '가')} 완성되어 ${n.completesCombo.points}점이 한꺼번에 들어옵니다.`);
  } else {
    for (const c of COMBOS) {
      const before = myCaptured.filter(c.member).length;
      const add = gained.filter(c.member).length;
      if (add > 0 && before + add < c.need && before + add >= 2) {
        out.push(`${c.name} ${before + add}/${c.need}장 — 한 장만 더 모으면 ${c.points}점입니다.`);
      }
    }
  }
  if (n.piAfter > n.piBefore) {
    const line =
      n.piBefore < 10 && n.piAfter >= 10
        ? `피가 ${n.piBefore}장 → ${n.piAfter}장. 10장을 넘기면 피 1점이 생기고, 피박(5장 이하) 걱정도 사라집니다.`
        : n.piAfter <= 5
          ? `피가 ${n.piBefore}장 → ${n.piAfter}장. 아직 5장 이하라 상대가 피로 나면 피박(×2)입니다 — 피를 모아 둘수록 안전합니다.`
          : `피가 ${n.piBefore}장 → ${n.piAfter}장 (10장부터 1점).`;
    out.push(line);
  }
  if (e.actionType === 'MATCH' && e.targets.length === 1) {
    out.push(
      n.sameUnseen === 0
        ? `같은 ${e.card.month}월이 더 남아있지 않아 뒤집어서 뻑이 날 위험이 없습니다.`
        : `같은 ${e.card.month}월이 아직 ${n.sameUnseen}장 안 보여 더미에서 뒤집혀 뻑이 날 확률은 약 ${pct(n.ppeokProb)}입니다.`,
    );
  }
  if (e.actionType === 'DISCARD') {
    out.push(`바닥에 짝이 없어 먹을 수 있는 패가 없습니다. 이럴 땐 가장 덜 아까운 패를 버리는 게 원칙입니다.`);
    out.push(`${e.card.name}${josa(e.card.name, '은', '는')} 점수 가치가 ${cardValue(e.card)}로 손패 중 가장 낮은 편입니다.`);
    if (n.sameUnseen === 0) out.push(`게다가 같은 월이 더 남아있지 않아 아무도 이 패를 먹어갈 수 없습니다.`);
    else if (n.ppeokProb > 0) out.push(`같은 월이 뒤집히면(약 ${pct(n.ppeokProb)}) 쪽으로 오히려 피를 뺏어올 수도 있습니다.`);
  }
  return out;
}

/** 차선책이 추천 수보다 못한 이유 한 줄 */
function weakness(alt: MoveEvaluation, best: MoveEvaluation): string {
  if (alt.notes.feeds) return `버리면 ${alt.notes.feeds.opponent.name}의 ${alt.notes.feeds.combo.name} 완성을 도와줍니다`;
  if (best.notes.blocks && !alt.notes.blocks) {
    const c = best.notes.blocks.combo.name;
    return `상대 ${c}${josa(c, '을', '를')} 막지 못합니다`;
  }
  if (alt.riskPenalty > best.riskPenalty + 3) return `뻑 위험이 높습니다 (약 ${pct(alt.notes.ppeokProb)})`;
  if (alt.actionType === 'DISCARD' && best.actionType === 'MATCH') return '아무것도 못 먹고 버리게 됩니다';
  if (alt.notes.scoreDelta < best.notes.scoreDelta) return '점수가 덜 오릅니다';
  if (alt.actionType === 'DISCARD') return `버리기엔 아까운 패입니다 (가치 ${cardValue(alt.card)})`;
  return '가져오는 패의 가치가 더 낮습니다';
}
