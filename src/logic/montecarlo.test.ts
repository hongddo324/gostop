import { describe, expect, it } from 'vitest';
import { createDeck } from '../game/cards';
import { dealGame, seededRng } from '../game/deal';
import { splitSeats } from '../game/seats';
import type { GameState, HwatuCard } from '../game/types';
import { DEFAULT_MC, mcChooseCard, mcDecideGo, seededMc } from './montecarlo';

const DECK = createDeck();
const C = (id: string): HwatuCard => DECK.find((x) => x.id === id)!;

/** 나(me)가 선인 판에서 손패/바닥/득점 패를 지정 */
function mk(hand: string[], field: string[], captured: string[] = []): GameState {
  const { players, observer } = splitSeats('uncle');
  const g = dealGame(players, observer, seededRng(5), 'me');
  const used = new Set([...hand, ...field, ...captured]);
  const others = DECK.filter((c) => !used.has(c.id));
  let k = 0;
  const take = (n: number) => others.slice(k, (k += n));
  return {
    ...g,
    players: g.players.map((p) => (p.seat.isHuman ? { ...p, hand: hand.map(C), captured: captured.map(C) } : { ...p, hand: take(hand.length), captured: [] })),
    field: field.map(C),
    deck: take(g.deck.length),
  };
}

describe('타짜(몬테카를로)', () => {
  it('3광을 완성하는 수를 고른다', () => {
    const s = mk(['08-gwang', '07-pi-1', '09-pi-1'], ['08-pi-1', '05-pi-1'], ['01-gwang', '03-gwang']);
    expect(mcChooseCard(s, seededMc(1, 60)).id).toBe('08-gwang');
  });

  it('보너스패는 바로 낸다', () => {
    const s = mk(['bonus-1', '07-pi-1'], ['05-pi-1']);
    expect(mcChooseCard(s, seededMc(1, 10)).id).toBe('bonus-1');
  });

  it('손패가 없으면 고를 하지 않는다', () => {
    const s = mk(['07-pi-1'], ['05-pi-1']);
    const noHand = { ...s, phase: 'goStop' as const, players: s.players.map((p) => (p.seat.isHuman ? { ...p, hand: [] } : p)) };
    expect(mcDecideGo(noHand, seededMc(1, 10))).toBe(false);
  });

  it('한 번의 판단이 시간 예산 안에 끝난다', () => {
    const { players, observer } = splitSeats('uncle');
    const s = dealGame(players, observer, seededRng(9), 'me');
    const t0 = performance.now();
    mcChooseCard(s, DEFAULT_MC);
    const ms = performance.now() - t0;
    process.stdout.write(`MC decision ms=${ms.toFixed(0)}\n`);
    expect(ms).toBeLessThan(DEFAULT_MC.budgetMs + 250);
  });
});
