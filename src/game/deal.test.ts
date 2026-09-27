import { describe, expect, it } from 'vitest';
import { createDeck, createStandardDeck } from './cards';
import { FIELD_SIZE, HAND_SIZE, dealGame, seededRng, shuffle } from './deal';
import { pickGwangSeller, splitSeats } from './seats';

describe('createDeck', () => {
  const deck = createStandardDeck();

  it('표준 48장 + 보너스 2장 = 50장, 고유 ID', () => {
    expect(deck).toHaveLength(48);
    const all = createDeck();
    expect(all).toHaveLength(50);
    expect(new Set(all.map((c) => c.id)).size).toBe(50);
    expect(all.filter((c) => c.isBonus).map((c) => c.piValue)).toEqual([2, 3]);
  });

  it('월별 4장', () => {
    for (let m = 1; m <= 12; m++) expect(deck.filter((c) => c.month === m)).toHaveLength(4);
  });

  it('종류별 장수: 광5 / 열끗9 / 띠10 / 피24', () => {
    const count = (t: string) => deck.filter((c) => c.type === t).length;
    expect(count('gwang')).toBe(5);
    expect(count('yeol')).toBe(9);
    expect(count('tti')).toBe(10);
    expect(count('pi')).toBe(24);
  });

  it('띠 구성: 홍단3 / 청단3 / 초단3', () => {
    const ribbon = (r: string) => deck.filter((c) => c.ribbon === r).length;
    expect([ribbon('hong'), ribbon('cheong'), ribbon('cho')]).toEqual([3, 3, 3]);
  });
});

describe('shuffle', () => {
  it('원본 불변 + 동일 원소 유지', () => {
    const src = createDeck();
    const out = shuffle(src, seededRng(1));
    expect(out).not.toBe(src);
    expect([...out].map((c) => c.id).sort()).toEqual(src.map((c) => c.id).sort());
  });

  it('같은 시드면 같은 결과', () => {
    const a = shuffle(createDeck(), seededRng(42)).map((c) => c.id);
    const b = shuffle(createDeck(), seededRng(42)).map((c) => c.id);
    expect(a).toEqual(b);
  });
});

describe('dealGame', () => {
  const { players, observer } = splitSeats('uncle');
  const state = dealGame(players, observer, seededRng(7));

  it('3인 7장 / 바닥 6장 / 나머지 더미 (바닥 보너스는 선이 가져가고 보충)', () => {
    expect(state.players).toHaveLength(3);
    state.players.forEach((p) => expect(p.hand).toHaveLength(HAND_SIZE));
    expect(state.field).toHaveLength(FIELD_SIZE);
    const bonusTaken = state.players[0]!.captured.length;
    expect(state.deck).toHaveLength(50 - 3 * HAND_SIZE - FIELD_SIZE - bonusTaken);
  });

  it('여러 시드에서 중복/누락 없음, 바닥에 보너스패 없음', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const g = dealGame(players, observer, seededRng(seed));
      const all = [...g.players.flatMap((p) => [...p.hand, ...p.captured]), ...g.field, ...g.deck];
      expect(new Set(all.map((c) => c.id)).size).toBe(50);
      expect(g.field.some((c) => c.isBonus)).toBe(false);
    }
  });

  it('참관자는 플레이어에 포함되지 않음', () => {
    expect(state.observer.id).toBe('uncle');
    expect(state.players.map((p) => p.seat.id)).not.toContain('uncle');
  });
});

describe('카드 이미지 에셋', () => {
  it('표준 48장 모두 public/assets/cards/{id}.webp 가 존재 (보너스패는 코드로 그림)', async () => {
    const { existsSync } = await import('node:fs');
    const missing = createStandardDeck().filter((c) => !existsSync(`public/assets/cards/${c.id}.webp`));
    expect(missing.map((c) => c.id)).toEqual([]);
  });
});

describe('광 팔기 (훈수)', () => {
  it('광 판 사람 7장: 광 장수 계산, 판 뒤 더미 맨 아래로', () => {
    const { players, observer } = splitSeats('grandma');
    for (let seed = 1; seed <= 50; seed++) {
      const g = dealGame(players, observer, seededRng(seed));
      expect(g.gwangSale.sellerId).toBe('grandma');
      expect(g.gwangSale.hand).toHaveLength(7);
      expect(g.gwangSale.gwangCount).toBe(g.gwangSale.hand.filter((c) => c.type === 'gwang').length);
      expect(g.deck.slice(-7).map((c) => c.id)).toEqual(g.gwangSale.hand.map((c) => c.id));
      expect(g.players.map((p) => p.seat.id)).not.toContain('grandma');
    }
  });

  it('광 팔 사람은 항상 상대 3명 중 1명 (나는 항상 참여)', () => {
    const picked = new Set(Array.from({ length: 200 }, (_, i) => pickGwangSeller(seededRng(i + 1)).id));
    expect(picked).toEqual(new Set(['grandma', 'uncle', 'father-in-law']));
  });
});
