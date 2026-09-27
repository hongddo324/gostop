import { useCallback, useState } from 'react';
import type { Difficulty } from './logic/aiEngine';

export const SPEEDS = [1, 1.5, 2, 3] as const;
export type Speed = (typeof SPEEDS)[number];

export interface Settings {
  /** 상대 AI 난이도 */
  difficulty: Difficulty;
  /** 게임 배속 (1배속 = 기본, 가족끼리 치듯 느긋하게) */
  speed: Speed;
  /** 도움 모드: 내 패널에 '훈수 듣기' 버튼 + 상세 설명 */
  helpMode: boolean;
  /** 내 차례마다 훈수석이 자동으로 한마디 */
  autoHint: boolean;
}

export const DEFAULT_SETTINGS: Settings = { difficulty: 'intermediate', speed: 1, helpMode: true, autoHint: true };

const KEY = 'gostop.settings.v1';

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** 설정 상태 + localStorage 저장 (저장 실패해도 동작에는 영향 없음) */
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(load);
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
