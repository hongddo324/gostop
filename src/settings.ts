import { useCallback, useState } from 'react';
import type { Difficulty } from './logic/aiEngine';

export const SPEEDS = [1, 1.5, 2, 3] as const;
export type Speed = (typeof SPEEDS)[number];

export interface Settings {
  /** 상대별 AI 난이도 (좌석 id → 난이도) */
  difficulties: Record<string, Difficulty>;
  /** 게임 배속 (1배속 = 기본, 가족끼리 치듯 느긋하게) */
  speed: Speed;
  /** 훈수 모드: 광 판 사람이 빈자리에서 카톡으로 훈수 + '훈수 듣기' 버튼·상세 설명. 끄면 훈수는 말이 없다 */
  helpMode: boolean;
  /** (훈수 모드일 때) 내 차례마다 자동으로 한마디 */
  autoHint: boolean;
}

const AI_SEATS = ['grandma', 'uncle', 'father-in-law'] as const;
const allAt = (d: Difficulty) => Object.fromEntries(AI_SEATS.map((id) => [id, d])) as Record<string, Difficulty>;

export const DEFAULT_SETTINGS: Settings = { difficulties: allAt('intermediate'), speed: 1, helpMode: true, autoHint: true };

/** 좌석의 난이도 (설정에 없으면 중급) */
export const difficultyOf = (s: Settings, seatId: string): Difficulty => s.difficulties[seatId] ?? 'intermediate';

const KEY = 'gostop.settings.v1';

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    // 이전 버전(전체 공통 difficulty 하나)에서 올라온 설정은 모든 상대에게 같은 난이도로 옮긴다
    const saved = JSON.parse(raw) as Partial<Settings> & { difficulty?: Difficulty };
    const difficulties = { ...(saved.difficulty ? allAt(saved.difficulty) : DEFAULT_SETTINGS.difficulties), ...saved.difficulties };
    delete saved.difficulty;
    return { ...DEFAULT_SETTINGS, ...saved, difficulties };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** 설정 상태 + localStorage 저장 (저장 실패해도 동작에는 영향 없음) */
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* 저장 불가 환경(시크릿 모드 등)은 무시 */
      }
      return next;
    });
  }, []);
  return { settings, update };
}
