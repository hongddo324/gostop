import { describe, expect, it } from 'vitest';
import { dealGame, seededRng } from './deal';
import { initialWallets, settleMoney, toBills } from './money';
import { SEATS, splitSeats } from './seats';
import type { GameState } from './types';

const IDS = SEATS.map((s) => s.id);

function endedGame(opts: { winner: string | null; losers: { seatId: string; points: number }[]; gwangPrice: number }): GameState {
  const { players, observer } = splitSeats('grandma');
  const g = dealGame(players, observer, seededRng(3));
  return {
    ...g,
    phase: 'end',
    gwangSale: { ...g.gwangSale, gwangCount: opts.gwangPrice, pricePerPlayer: opts.gwangPrice },
    result: {
      winnerId: opts.winner,
      baseScore: 0,
      goCount: 0,
      score: 0,
      losers: opts.losers.map((l) => ({ ...l, gwangBak: false, piBak: false })),
    },
  };
}

describe('돈 정산 (1점 = 1,000원)', () => {
  it('모두 3만원으로 시작', () => {
    expect(initialWallets(IDS)).toEqual({ me: 30000, grandma: 30000, uncle: 30000, 'father-in-law': 30000 });
  });

  it('광값 + 판돈: 승자는 패자들에게서, 광 판 사람은 플레이어 모두에게서 받는다', () => {
    const g = endedGame({
      winner: 'me',
      losers: [
        { seatId: 'uncle', points: 6 },
        { seatId: 'father-in-law', points: 3 },
      ],
      gwangPrice: 2,
    });
    const r = settleMoney(initialWallets(IDS), g);
    expect(r.deltas).toEqual({ me: -2000 + 9000, grandma: 6000, uncle: -2000 - 6000, 'father-in-law': -2000 - 3000 });
    expect(Object.values(r.wallets).reduce((a, b) => a + b, 0)).toBe(120000); // 총액 보존
  });

  it('가진 돈보다 많이 낼 수 없다 (빚 없음)', () => {
    const g = endedGame({ winner: 'me', losers: [{ seatId: 'uncle', points: 50 }], gwangPrice: 0 });
    const r = settleMoney({ ...initialWallets(IDS), uncle: 7000 }, g);
    expect(r.wallets.uncle).toBe(0);
    expect(r.deltas.me).toBe(7000);
  });

  it('나가리면 광값만 오간다', () => {
    const g = endedGame({ winner: null, losers: [], gwangPrice: 1 });
    const r = settleMoney(initialWallets(IDS), g);
    expect(r.deltas.grandma).toBe(3000);
    expect(r.transfers.every((t) => t.reason === '광값')).toBe(true);
  });

  it('지폐 나누기', () => {
    expect(toBills(30000)).toEqual({ 50000: 0, 10000: 3, 5000: 0, 1000: 0 });
    expect(toBills(86000)).toEqual({ 50000: 1, 10000: 3, 5000: 1, 1000: 1 });
  });
});
