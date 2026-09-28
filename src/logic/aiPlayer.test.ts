import { describe, expect, it } from 'vitest';
import { goProbability } from './aiPlayer';

const base = { handCount: 5, goCount: 0, safe: true };

describe('goProbability — AI 도 확률로 고를 부른다', () => {
  it('낼 패가 없으면 고를 하지 않는다', () => {
    for (const d of ['beginner', 'intermediate', 'expert'] as const) {
      expect(goProbability(d, { ...base, handCount: 0, evDiff: 5, recommendGo: true })).toBe(0);
    }
  });

  it('초급은 반반', () => {
    expect(goProbability('beginner', base)).toBe(0.5);
  });

  it('중급: 휴리스틱이 스톱을 권해도 배짱 고가 나올 수 있고, 위험하면 줄어든다', () => {
    expect(goProbability('intermediate', { ...base, recommendGo: true })).toBeGreaterThan(0.8);
    const brave = goProbability('intermediate', { ...base, recommendGo: false });
    const risky = goProbability('intermediate', { ...base, recommendGo: false, safe: false });
    expect(brave).toBeGreaterThan(0.2);
    expect(risky).toBeGreaterThan(0);
    expect(risky).toBeLessThan(brave);
  });

  it('고급·타짜: 기대 금액이 비슷하면 반반보다 조금 더(배짱), 고가 확실히 손해면 드물고 이득이면 대부분 고', () => {
    expect(goProbability('expert', { ...base, evDiff: 0 })).toBeGreaterThan(0.5);
    expect(goProbability('expert', { ...base, evDiff: 0 })).toBeLessThan(0.7);
    expect(goProbability('expert', { ...base, evDiff: -4, safe: false })).toBeLessThan(0.1);
    expect(goProbability('expert', { ...base, evDiff: -4 })).toBeGreaterThan(0); // 안전하면 가끔은 배짱
    expect(goProbability('expert', { ...base, evDiff: 3 })).toBeGreaterThan(0.85);
  });

  it('여러 번 고를 불렀거나 마지막 1장이면 욕심을 줄인다', () => {
    expect(goProbability('beginner', { ...base, goCount: 2 })).toBeLessThan(0.5);
    expect(goProbability('beginner', { ...base, handCount: 1 })).toBeLessThan(0.5);
  });
});
