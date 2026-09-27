import { RULES } from './rules';
import type { GameState } from './types';

/** 좌석별 가진 돈(원) */
export type Wallets = Record<string, number>;

export const BILL_VALUES = [50000, 10000, 5000, 1000] as const;
export type BillValue = (typeof BILL_VALUES)[number];

export interface Transfer {
  from: string;
  to: string;
  amount: number;
  reason: '광값' | '판돈';
}

export interface MoneySettlement {
  wallets: Wallets;
  /** 좌석별 증감 */
  deltas: Record<string, number>;
  transfers: Transfer[];
}

export function initialWallets(seatIds: readonly string[]): Wallets {
  return Object.fromEntries(seatIds.map((id) => [id, RULES.startingMoney]));
}

/**
 * 판 정산: 1점 = RULES.wonPerPoint 원.
 *  1) 광값: 플레이어 각자가 광 판 사람에게 (광값 점수 × 1점 금액)
 *  2) 판돈: 패자 각자가 승자에게 (박 반영 점수 × 1점 금액). 나가리면 판돈 없음
 * 가진 돈보다 많이 낼 수는 없다 (있는 만큼만 — 빚 없음).
 */
export function settleMoney(wallets: Wallets, game: GameState): MoneySettlement {
  const next: Wallets = { ...wallets };
  const deltas: Record<string, number> = Object.fromEntries(Object.keys(wallets).map((k) => [k, 0]));
  const transfers: Transfer[] = [];

  const pay = (from: string, to: string, want: number, reason: Transfer['reason']) => {
    const amount = Math.max(0, Math.min(want, next[from] ?? 0));
    if (amount <= 0) return;
    next[from] = (next[from] ?? 0) - amount;
    next[to] = (next[to] ?? 0) + amount;
    deltas[from] = (deltas[from] ?? 0) - amount;
    deltas[to] = (deltas[to] ?? 0) + amount;
    transfers.push({ from, to, amount, reason });
  };

  const sale = game.gwangSale;
  if (sale.pricePerPlayer > 0) {
    for (const p of game.players) pay(p.seat.id, sale.sellerId, sale.pricePerPlayer * RULES.wonPerPoint, '광값');
  }
  const res = game.result;
  if (res?.winnerId) {
    for (const l of res.losers) pay(l.seatId, res.winnerId, l.points * RULES.wonPerPoint, '판돈');
  }
  return { wallets: next, deltas, transfers };
}

/** 금액을 큰 지폐부터 나눈 장수 (예: 36000 → 만원 3, 오천원 1, 천원 1) */
export function toBills(amount: number): Record<BillValue, number> {
  let rest = Math.max(0, Math.floor(amount / 1000) * 1000);
  const out = {} as Record<BillValue, number>;
  for (const v of BILL_VALUES) {
    out[v] = Math.floor(rest / v);
    rest -= out[v] * v;
  }
  return out;
}

export const formatWon = (n: number) => `${n.toLocaleString('ko-KR')}원`;
