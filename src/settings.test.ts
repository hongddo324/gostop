import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('설정 — 사람별 난이도', () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
    });
    vi.resetModules();
  });

  it('이전 버전의 공통 난이도는 세 분 모두에게 옮겨진다', async () => {
    store.set('gostop.settings.v1', JSON.stringify({ difficulty: 'expert', speed: 2 }));
    const { loadSettings, difficultyOf } = await import('./settings');
    const s = loadSettings();
    expect(s.speed).toBe(2);
    expect(['grandma', 'uncle', 'father-in-law'].map((id) => difficultyOf(s, id))).toEqual(['expert', 'expert', 'expert']);
    expect('difficulty' in s).toBe(false);
  });

  it('사람별 난이도가 저장돼 있으면 그대로 쓴다', async () => {
    store.set('gostop.settings.v1', JSON.stringify({ difficulties: { grandma: 'beginner', 'father-in-law': 'expert' } }));
    const { loadSettings, difficultyOf } = await import('./settings');
    const s = loadSettings();
    expect(difficultyOf(s, 'grandma')).toBe('beginner');
    expect(difficultyOf(s, 'uncle')).toBe('intermediate');
    expect(difficultyOf(s, 'father-in-law')).toBe('expert');
  });
});
