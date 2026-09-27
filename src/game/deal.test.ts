import { describe, expect, it } from 'vitest';
import { createDeck } from './cards';
import { FIELD_SIZE, HAND_SIZE, dealGame, seededRng, shuffle } from './deal';
import { splitSeats } from './seats';

describe('createDeck', () => {
  const deck = createDeck();

  it('48장, 고유 ID', () => {
    expect(deck).toHaveLength(48);
    expect(new Set(deck.map((c) => c.id)).size).toBe(48);
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

  it('3인 7장 / 바닥 6장 / 더미 21장', () => {
    expect(state.players).toHaveLength(3);
    state.players.forEach((p) => expect(p.hand).toHaveLength(HAND_SIZE));
    expect(state.field).toHaveLength(FIELD_SIZE);
    expect(state.deck).toHaveLength(48 - 3 * HAND_SIZE - FIELD_SIZE);
  });

  it('중복/누락 없음', () => {
    const all = [...state.players.flatMap((p) => p.hand), ...state.field, ...state.deck];
    expect(new Set(all.map((c) => c.id)).size).toBe(48);
  });

  it('참관자는 플레이어에 포함되지 않음', () => {
    expect(state.observer.id).toBe('uncle');
    expect(state.players.map((p) => p.seat.id)).not.toContain('uncle');
  });
});

describe('카드 이미지 에셋', () => {
  it('48장 모두 public/assets/cards/{id}.webp 가 존재', async () => {
    const { existsSync } = await import('node:fs');
    const missing = createDeck().filter((c) => !existsSync(`public/assets/cards/${c.id}.webp`));
    expect(missing.map((c) => c.id)).toEqual([]);
  });
});
