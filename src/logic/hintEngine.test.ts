import { describe, expect, it } from 'vitest';
import { createDeck } from '../game/cards';
import type { HwatuCard } from '../game/types';
import { decideGoAi, evaluateAiMove, type OpponentState } from './aiEngine';
import { getHintExplanation } from './hintEngine';

const DECK = createDeck();
const C = (id: string): HwatuCard => {
  const c = DECK.find((x) => x.id === id);
  if (!c) throw new Error(id);
  return c;
};
const cs = (...ids: string[]) => ids.map(C);
const opp = (name: string, captured: HwatuCard[], score = 0): OpponentState => ({ id: name, name, captured, score });

describe('getHintExplanation — 상황별 훈수', () => {
  it('상대 견제: 상대 고도리 1장 남음 → 내 득점보다 8월 열끗 가로채기', () => {
    const hint = getHintExplanation({
      hand: cs('08-pi-1', '01-gwang'),
      field: cs('08-yeol', '01-pi-1'),
      opponents: [opp('이모부님', cs('02-yeol', '04-yeol'))],
      deckRemainingCount: 15,
    });
    expect(hint.recommendedCardId).toBe('08-pi-1');
    expect(hint.reasonCode).toBe('DEFENSE');
    expect(hint.primaryReason).toBe('상대 고도리 완성 차단');
    expect(hint.detailedExplanation).toContain('고도리 완성까지 단 1장(8월)만 남겨두고');
    expect(hint.scoreBreakdown.defenseScore).toBeGreaterThanOrEqual(100);
  });

  it('족보 달성: 홍단 2장 보유 + 바닥 3월 띠 → 홍단(3점) 즉시 완성', () => {
    const hint = getHintExplanation({
      hand: cs('03-pi-1', '05-pi-1'),
      field: cs('03-tti', '05-pi-2'),
      opponents: [opp('장인어른', [])],
      deckRemainingCount: 15,
      myCaptured: cs('01-tti', '02-tti'),
    });
    expect(hint.recommendedCardId).toBe('03-pi-1');
    expect(hint.reasonCode).toBe('COMBO');
    expect(hint.detailedExplanation).toBe('이 패를 먹으면 홍단(3점)이 즉시 완성됩니다. 가장 확실한 득점 루트입니다.');
  });

  it('피 전략: 피 8장 → 쌍피 가져와 10장 채우기', () => {
    const hint = getHintExplanation({
      hand: cs('11-pi-2', '06-tti'),
      field: cs('11-pi-1', '06-pi-1'),
      opponents: [opp('외할머니', [])],
      deckRemainingCount: 15,
      myCaptured: cs('01-pi-1', '01-pi-2', '02-pi-1', '02-pi-2', '03-pi-1', '03-pi-2', '04-pi-1', '04-pi-2'),
    });
    expect(hint.recommendedCardId).toBe('11-pi-2');
    expect(hint.reasonCode).toBe('PI_TEN');
    expect(hint.detailedExplanation).toContain('현재 내 피가 8장입니다. 이번 턴에 쌍피를 가져와 10장을 채우면');
  });

  it('안전한 버림패: 짝이 없으면 점수 가치가 가장 낮은 일반 피', () => {
    const hint = getHintExplanation({
      hand: cs('01-gwang', '07-pi-1', '03-tti'),
      field: cs('05-pi-1', '09-pi-1'),
      opponents: [opp('장인어른', [])],
      deckRemainingCount: 15,
    });
    expect(hint.recommendedCardId).toBe('07-pi-1');
    expect(hint.actionType).toBe('DISCARD');
    expect(hint.detailedExplanation).toContain('7월 일반 피를 버리는 것이 가장 안전합니다');
  });

  it('자폭(뻑) 회피: 남은 패 카운팅상 뻑 확률이 높은 패 대신 차선책', () => {
    const hand = cs('10-yeol', '06-pi-1');
    const field = cs('10-pi-1', '06-pi-2');
    // 아직 안 보인 카드가 적고 그중 10월이 2장 → 10월을 내면 뻑 확률 ↑
    const unseen = new Set(['10-tti', '10-pi-2', '12-pi-1', '11-pi-3', '09-pi-2']);
    const used = new Set([...hand, ...field].map((c) => c.id));
    const rest = DECK.filter((c) => !unseen.has(c.id) && !used.has(c.id));
    const hint = getHintExplanation({
      hand,
      field,
      opponents: [opp('이모부님', rest)],
      deckRemainingCount: 5,
    });
    expect(hint.recommendedCardId).toBe('06-pi-1');
    expect(hint.reasonCode).toBe('RISK');
    expect(hint.detailedExplanation).toContain('10월 단풍 열끗을 낼 경우 뻑이 날 위험도가 높으므로 차선책인 6월 피를 추천합니다');
    expect(hint.scoreBreakdown.riskPenalty).toBe(0);
  });
});

describe('evaluateAiMove — 난이도별', () => {
  const hand = cs('08-pi-1', '01-gwang', '07-pi-2');
  const field = cs('08-yeol', '01-pi-1');
  const opponents = [opp('이모부님', cs('02-yeol', '04-yeol'))];

  it('초급: 짝이 있는 패 중에서만 무작위로 고른다', () => {
    for (let i = 0; i < 20; i++) {
      const c = evaluateAiMove(hand, field, opponents, 15, 'beginner', [], () => i / 20);
      expect(['08-pi-1', '01-gwang']).toContain(c.id);
    }
  });

  it('중급: 견제 없이 내 득점만 (광 먹기)', () => {
    expect(evaluateAiMove(hand, field, opponents, 15, 'intermediate').id).toBe('01-gwang');
  });

  it('고급: 상대 고도리 차단 우선', () => {
    expect(evaluateAiMove(hand, field, opponents, 15, 'expert').id).toBe('08-pi-1');
  });

  it('보너스패는 난이도와 무관하게 먼저', () => {
    for (const d of ['beginner', 'intermediate', 'expert'] as const) {
      expect(evaluateAiMove(cs('01-gwang', 'bonus-2'), field, opponents, 15, d).id).toBe('bonus-2');
    }
  });
});

describe('decideGoAi — 고/스톱', () => {
  const base = { myScore: 3, goCount: 0, handCount: 4, myCaptured: cs('01-gwang', '03-gwang', '08-gwang'), opponents: [opp('a', [], 0)] };
  it('중급: 1고는 하고 그 다음은 스톱', () => {
    expect(decideGoAi(base, 'intermediate')).toBe(true);
    expect(decideGoAi({ ...base, goCount: 1 }, 'intermediate')).toBe(false);
  });
  it('고급: 상대 점수가 2점 이상이거나 리치면 스톱, 안전하면 고', () => {
    expect(decideGoAi(base, 'expert')).toBe(true);
    expect(decideGoAi({ ...base, opponents: [opp('a', [], 2)] }, 'expert')).toBe(false);
    expect(decideGoAi({ ...base, opponents: [opp('a', cs('02-yeol', '04-yeol'))] }, 'expert')).toBe(false);
  });
  it('초급: 50% 확률', () => {
    expect(decideGoAi(base, 'beginner', () => 0.3)).toBe(true);
    expect(decideGoAi(base, 'beginner', () => 0.7)).toBe(false);
  });
});
