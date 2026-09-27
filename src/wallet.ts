import { useCallback, useState } from 'react';
import { initialWallets, type Wallets } from './game/money';
import { SEATS } from './game/seats';

const KEY = 'gostop.wallets.v1';
const IDS = SEATS.map((s) => s.id);

function load(): Wallets {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...initialWallets(IDS), ...(JSON.parse(raw) as Wallets) };
  } catch {
    /* 저장소 사용 불가 → 기본값 */
  }
  return initialWallets(IDS);
}

function save(w: Wallets) {
  try {
    localStorage.setItem(KEY, JSON.stringify(w));
  } catch {
    /* 저장 실패는 무시 (이번 실행 동안만 유지) */
  }
}

/** 좌석별 돈 — 설정에서 '돈 초기화' 하기 전까지 저장된다 */
export function useWallets() {
  const [wallets, setWallets] = useState<Wallets>(load);
  const set = useCallback((w: Wallets) => {
    save(w);
    setWallets(w);
  }, []);
  const reset = useCallback(() => set(initialWallets(IDS)), [set]);
  return { wallets, setWallets: set, reset };
}
