import { describe, expect, it } from 'vitest';
import { chooseTargetAi, decideGoAi, evaluateAiMove, type Difficulty } from '../logic/aiEngine';
import { visibleContext } from '../logic/aiContext';
import { createDeck } from './cards';
import { dealGame, seededRng } from './deal';
import { choose, declareGoStop, flipCard, playCard, resolveTurn, totalCards } from './engine';
import { applyGoBonus, scoreOf } from './scoring';
import { splitSeats } from './seats';
import type { GameState, HwatuCard } from './types';

const DECK = createDeck();
const C = (id: string): HwatuCard => {
  const c = DECK.find((x) => x.id === id);
  if (!c) throw new Error(id);
  return c;
};

/** 테스트용 상태: 플레이어 0 차례 */
function mk(opts: { hand: string[]; field: string[]; deck: string[]; opp?: string[][] }): GameState {
  const { players, observer } = splitSeats('uncle');
  const base = dealGame(players, observer, seededRng(1));
  return {
    ...base,
    players: base.players.map((p, i) => ({
      ...p,
      // 상대는 손패 1장씩 — '마지막 턴'이 아니게 하기 위함
      hand: i === 0 ? opts.hand.map(C) : [C(i === 1 ? '11-pi-3' : '11-pi-2')],
      captured: (opts.opp?.[i - 1] ?? []).map(C),
    })),
    field: opts.field.map(C),
    deck: opts.deck.map(C),
  };
}

/** 한 턴 진행 (선택이 필요하면 첫 번째 옵션) */
function runTurn(s: GameState, cardId: string): GameState {
  s = playCard(s, cardId);
  if (s.phase === 'choose') s = choose(s, s.pending!.options[0]!.id);
  s = flipCard(s);
  if (s.phase === 'choose') s = choose(s, s.pending!.options[0]!.id);
  return resolveTurn(s);
}
const capturedIds = (s: GameState, i = 0) => s.players[i]!.captured.map((c) => c.id).sort();

describe('기본 먹기', () => {
  it('낸 패와 뒤집은 패가 각각 짝을 먹는다', () => {
    const s = runTurn(mk({ hand: ['01-gwang'], field: ['01-pi-1', '05-pi-1'], deck: ['05-tti'] }), '01-gwang');
    expect(capturedIds(s)).toEqual(['01-gwang', '01-pi-1', '05-pi-1', '05-tti']);
    expect(s.field).toHaveLength(0);
  });

  it('짝이 없으면 바닥에 남는다', () => {
    const s = runTurn(mk({ hand: ['01-gwang'], field: ['02-pi-1'], deck: ['03-pi-1'] }), '01-gwang');
    expect(capturedIds(s)).toEqual([]);
    expect(s.field.map((c) => c.id).sort()).toEqual(['01-gwang', '02-pi-1', '03-pi-1']);
  });

  it('같은 월 2장이면 선택 단계로 간다', () => {
    const s = playCard(mk({ hand: ['01-gwang'], field: ['01-pi-1', '01-tti'], deck: ['03-pi-1'] }), '01-gwang');
    expect(s.phase).toBe('choose');
    const s2 = resolveTurn(flipCard(choose(s, '01-tti')));
    expect(capturedIds(s2)).toEqual(['01-gwang', '01-tti']);
    expect(s2.field.map((c) => c.id)).toContain('01-pi-1');
  });
});

describe('특수 상황', () => {
  const opp = [['02-pi-1', '02-pi-2'], ['04-pi-1']];

  it('쪽: 짝 없이 낸 패를 뒤집은 패로 먹으면 상대마다 피 1장', () => {
    const s = runTurn(mk({ hand: ['01-gwang'], field: ['03-pi-1'], deck: ['01-pi-1'], opp }), '01-gwang');
    expect(s.lastReport!.specials).toContain('jjok');
    expect(s.lastReport!.stolen).toHaveLength(2);
    expect(capturedIds(s)).toEqual(['01-gwang', '01-pi-1', '02-pi-1', '04-pi-1']);
  });

  it('뻑: 1장 짝에 낸 패 + 뒤집은 패까지 같은 월이면 3장이 바닥에 남는다', () => {
    const s = runTurn(mk({ hand: ['01-gwang'], field: ['01-pi-1'], deck: ['01-pi-2'] }), '01-gwang');
    expect(s.lastReport!.specials).toEqual(['ppeok']);
    expect(s.field).toHaveLength(3);
    expect(s.ppeokMonths).toEqual([1]);
  });

  it('뻑 먹기: 뻑 더미를 4번째 패로 먹으면 피 빼앗기', () => {
    let s = mk({ hand: ['01-tti'], field: ['01-gwang', '01-pi-1', '01-pi-2'], deck: ['05-pi-1'], opp });
    s = { ...s, ppeokMonths: [1] };
    s = runTurn(s, '01-tti');
    expect(s.lastReport!.specials).toContain('ppeokEat');
    expect(s.ppeokMonths).toEqual([]);
    expect(s.players[0]!.captured.filter((c) => c.month === 1)).toHaveLength(4);
  });

  it('따닥: 2장 깔린 월에 내고 같은 월을 뒤집으면 4장 모두 + 피 빼앗기', () => {
    const s = runTurn(mk({ hand: ['01-gwang'], field: ['01-pi-1', '01-pi-2', '07-pi-1'], deck: ['01-tti'], opp }), '01-gwang');
    expect(s.lastReport!.specials).toContain('ttadak');
    expect(s.players[0]!.captured.filter((c) => c.month === 1)).toHaveLength(4);
  });

  it('싹쓸이: 바닥을 모두 쓸면 피 빼앗기 (마지막 턴 제외)', () => {
    const base = mk({ hand: ['01-gwang', '09-pi-1'], field: ['01-pi-1', '05-pi-1'], deck: ['05-tti'], opp });
    const s = runTurn(base, '01-gwang');
    expect(s.field).toHaveLength(0);
    expect(s.lastReport!.specials).toContain('sweep');
  });

  it('쌍피만 있으면 쌍피를 준다', () => {
    const s = runTurn(
      mk({ hand: ['01-gwang'], field: ['03-pi-1'], deck: ['01-pi-1'], opp: [['11-pi-1'], []] }),
      '01-gwang',
    );
    expect(s.lastReport!.stolen.map((x) => x.card.id)).toEqual(['11-pi-1']);
  });
});

describe('보너스패', () => {
  it('손에서 내면 바로 득점 패로 가고, 더미 1장을 손에 받아 같은 차례에 한 번 더 낸다', () => {
    const s = playCard(mk({ hand: ['bonus-1', '01-gwang'], field: ['05-pi-1'], deck: ['07-pi-1', '09-pi-1'] }), 'bonus-1');
    expect(s.phase).toBe('play');
    expect(s.current).toBe(0);
    expect(capturedIds(s)).toEqual(['bonus-1']);
    expect(s.players[0]!.hand.map((c) => c.id).sort()).toEqual(['01-gwang', '07-pi-1']);
    expect(s.lastReport!.specials).toEqual(['bonus']);
    // 이어서 일반 패를 내고 턴 종료
    const s2 = runTurn(s, '01-gwang');
    expect(s2.current).toBe(1);
    expect(s2.lastReport!.specials).toContain('bonus');
  });

  it('더미에서 뒤집으면 바로 가져가고 한 장 더 뒤집는다', () => {
    const s = runTurn(mk({ hand: ['01-gwang'], field: ['05-pi-1'], deck: ['bonus-2', '05-tti'] }), '01-gwang');
    expect(capturedIds(s)).toEqual(['05-pi-1', '05-tti', 'bonus-2'].sort());
    expect(s.lastReport!.specials).toContain('bonus');
  });

  it('보너스패 2장은 각각 쌍피(피 2장 값)', () => {
    // 보너스 2장(4) + 일반 피 6장(6) = 10장 → 1점
    expect(scoreOf(['bonus-1', 'bonus-2', ...DECK.filter((c) => c.piValue === 1).slice(0, 6).map((c) => c.id)].map(C)).pi).toBe(1);
  });
});

describe('점수', () => {
  const score = (ids: string[]) => scoreOf(ids.map(C));
  it('3광 3점, 비광 포함 3광 2점, 4광 4점, 5광 15점', () => {
    expect(score(['01-gwang', '03-gwang', '08-gwang']).gwang).toBe(3);
    expect(score(['01-gwang', '03-gwang', '12-gwang']).gwang).toBe(2);
    expect(score(['01-gwang', '03-gwang', '08-gwang', '12-gwang']).gwang).toBe(4);
    expect(score(['01-gwang', '03-gwang', '08-gwang', '11-gwang', '12-gwang']).gwang).toBe(15);
  });
  it('고도리 5점, 홍단 3점', () => {
    expect(score(['02-yeol', '04-yeol', '08-yeol']).total).toBe(5);
    expect(score(['01-tti', '02-tti', '03-tti']).total).toBe(3);
  });
  it('피 10장 1점, 쌍피는 2장', () => {
    const pis = DECK.filter((c) => c.type === 'pi' && c.piValue === 1).slice(0, 8).map((c) => c.id);
    expect(score([...pis, '11-pi-1']).pi).toBe(1);
    expect(score(pis).pi).toBe(0);
  });
  it('고 보너스', () => {
    expect(applyGoBonus(5, 1)).toBe(6);
    expect(applyGoBonus(5, 2)).toBe(7);
    expect(applyGoBonus(5, 3)).toBe(16);
  });
});

describe('고/스톱', () => {
  it('3점 이상이면 goStop 단계, 스톱하면 종료 + 정산', () => {
    const base = mk({
      hand: ['08-gwang', '09-pi-1'],
      field: ['08-pi-1'],
      deck: ['10-pi-1'],
      opp: [['02-pi-1'], []],
    });
    let s: GameState = { ...base, players: base.players.map((p, i) => (i === 0 ? { ...p, captured: ['01-gwang', '03-gwang'].map(C) } : p)) };
    s = runTurn(s, '08-gwang');
    expect(s.phase).toBe('goStop');
    const end = declareGoStop(s, false);
    expect(end.phase).toBe('end');
    expect(end.result!.winnerId).toBe(s.players[0]!.seat.id);
    expect(end.result!.baseScore).toBe(3);
    // 광이 없는 상대는 광박(×2)
    expect(end.result!.losers.every((l) => l.gwangBak)).toBe(true);
  });
});

describe('AI 전체 판 시뮬레이션', () => {
  it.each(['beginner', 'intermediate', 'expert'] as Difficulty[])('%s 300판: 카드 50장 보존, 모든 판이 종료', (difficulty) => {
    const { players, observer } = splitSeats('uncle');
    let wins = 0;
    let nagari = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const rng = seededRng(seed);
      let s = dealGame(players, observer, rng);
      let guard = 0;
      while (s.phase !== 'end') {
        if (++guard > 200) throw new Error(`무한 루프 seed=${seed}`);
        const v = visibleContext(s);
        switch (s.phase) {
          case 'play':
            s = playCard(s, evaluateAiMove(v.hand, v.field, v.opponents, v.deckRemainingCount, difficulty, v.myCaptured, rng).id);
            break;
          case 'choose':
            s = choose(s, chooseTargetAi(s.pending!.options, v.opponents, difficulty, v.myCaptured, rng).id);
            break;
          case 'flip':
            s = flipCard(s);
            break;
          case 'resolve':
            s = resolveTurn(s);
            break;
          case 'goStop':
            s = declareGoStop(s, decideGoAi({ ...v, handCount: v.hand.length }, difficulty, rng));
            break;
        }
        expect(totalCards(s)).toBe(50);
      }
      if (s.result!.winnerId) wins++;
      else {
        nagari++;
        expect(s.players.every((p) => p.hand.length === 0)).toBe(true);
      }
    }
    expect(wins + nagari).toBe(300);
    expect(wins).toBeGreaterThan(nagari); // 대부분의 판은 승자가 나온다
  });

  it('고급 AI 가 초급 AI 보다 강하다 (같은 판 1:2 대결 승률)', () => {
    const { players, observer } = splitSeats('uncle');
    const winsOf = (strong: Difficulty, weak: Difficulty) => {
      let strongWins = 0;
      for (let seed = 1; seed <= 400; seed++) {
        const rng = seededRng(seed);
        let s = dealGame(players, observer, rng);
        while (s.phase !== 'end') {
          const v = visibleContext(s);
          const d = s.players[s.current]!.seat.id === 'me' ? strong : weak;
          if (s.phase === 'play') s = playCard(s, evaluateAiMove(v.hand, v.field, v.opponents, v.deckRemainingCount, d, v.myCaptured, rng).id);
          else if (s.phase === 'choose') s = choose(s, chooseTargetAi(s.pending!.options, v.opponents, d, v.myCaptured, rng).id);
          else if (s.phase === 'flip') s = flipCard(s);
          else if (s.phase === 'resolve') s = resolveTurn(s);
          else s = declareGoStop(s, decideGoAi({ ...v, handCount: v.hand.length }, d, rng));
        }
        if (s.result!.winnerId === 'me') strongWins++;
      }
      return strongWins;
    };
    const expertVsBeginner = winsOf('expert', 'beginner');
    const beginnerVsBeginner = winsOf('beginner', 'beginner');
    expect(expertVsBeginner).toBeGreaterThan(beginnerVsBeginner);
  });
});
