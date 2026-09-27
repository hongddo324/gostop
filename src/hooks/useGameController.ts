import { useCallback, useEffect, useRef, useState } from 'react';
import type { CharacterPose } from '../components/CharacterSprite';
import { aiChooseCard, aiChooseTarget, aiDecideGo } from '../game/ai';
import { dealGame } from '../game/deal';
import { choose, currentPlayer, declareGoStop, flipCard, playCard, resolveTurn } from '../game/engine';
import type { GameState, PlayerSeat, SpecialEvent } from '../game/types';

/** 연출 타이밍 (ms) */
export const TIMING = {
  aiThink: 900, // AI 가 패를 고르는 시간
  playPose: 750, // 패 내는 모션 유지
  beforeFlip: 650, // 낸 패가 날아간 뒤 더미 뒤집기까지
  beforeResolve: 750, // 뒤집은 패 확인 후 먹기까지
  aiChoose: 600,
  aiGoStop: 1100,
  cheer: 1800,
  bubble: 1600,
};

export const SPECIAL_TEXT: Record<SpecialEvent, string> = {
  jjok: '쪽!',
  ppeok: '뻑!',
  ttadak: '따닥!',
  ppeokEat: '뻑 먹었다!',
  sweep: '싹쓸이!',
};

export interface Bubble {
  seq: number;
  text: string;
}

/**
 * 게임 진행 컨트롤러.
 * 엔진(순수 함수)의 단계를 타이머로 이어 붙여 AI 차례/더미 뒤집기/먹기를 자동 진행하고,
 * 사람 차례에는 입력을 기다린다. 캐릭터 모션과 말풍선도 여기서 관리한다.
 */
export function useGameController(players: PlayerSeat[], observer: PlayerSeat) {
  const [game, setGame] = useState<GameState | null>(null);
  const [motion, setMotion] = useState<Record<string, CharacterPose>>({});
  const [bubbles, setBubbles] = useState<Record<string, Bubble>>({});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const bubbleSeq = useRef(0);

  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  const setPose = useCallback((seatId: string, pose: CharacterPose | null, ms?: number) => {
    setMotion((m) => {
      const next = { ...m };
      if (pose) next[seatId] = pose;
      else delete next[seatId];
      return next;
    });
    if (pose && ms) later(ms, () => setMotion((m) => (m[seatId] === pose ? omit(m, seatId) : m)));
  }, [later]);

  const say = useCallback((seatId: string, text: string, ms = TIMING.bubble) => {
    const seq = ++bubbleSeq.current;
    setBubbles((b) => ({ ...b, [seatId]: { seq, text } }));
    later(ms, () => setBubbles((b) => (b[seatId]?.seq === seq ? omit(b, seatId) : b)));
  }, [later]);

  const deal = useCallback(() => {
    clearTimers();
    setMotion({});
    setBubbles({});
    setGame(dealGame(players, observer));
  }, [clearTimers, players, observer]);

  const reset = useCallback(() => {
    clearTimers();
    setMotion({});
    setBubbles({});
    setGame(null);
  }, [clearTimers]);

  /** 사람: 손패 내기 */
  const humanPlay = useCallback((cardId: string) => {
    setGame((g) => (g && g.phase === 'play' && currentPlayer(g).seat.isHuman ? playCard(g, cardId) : g));
  }, []);
  /** 사람: 같은 월 2장 중 선택 */
  const humanChoose = useCallback((cardId: string) => {
    setGame((g) => (g && g.phase === 'choose' ? choose(g, cardId) : g));
  }, []);
  /** 사람: 고/스톱 */
  const humanGoStop = useCallback((go: boolean) => {
    setGame((g) => {
      if (!g || g.phase !== 'goStop') return g;
      say(currentPlayer(g).seat.id, go ? '고!' : '스톱!');
      return declareGoStop(g, go);
    });
  }, [say]);

  // ── 자동 진행 (단계별 타이머) ─────────────────────────────
  useEffect(() => {
    if (!game) return;
    const me = currentPlayer(game);
    const ai = !me.seat.isHuman;
    let t: ReturnType<typeof setTimeout> | undefined;
    const step = (ms: number, fn: (g: GameState) => GameState) => {
      t = setTimeout(() => setGame((g) => (g === game ? fn(g) : g)), ms);
    };

    switch (game.phase) {
      case 'play':
        if (ai) {
          t = setTimeout(() => {
            setPose(me.seat.id, 'play', TIMING.playPose);
            setGame((g) => (g === game ? playCard(g, aiChooseCard(g).id) : g));
          }, TIMING.aiThink);
        }
        break;
      case 'choose':
        // 사람이 낸 패의 선택은 모달로, 뒤집은 패는 사람 차례여도 모달로 고른다
        if (ai) step(TIMING.aiChoose, (g) => choose(g, aiChooseTarget(g.pending!.options).id));
        break;
      case 'flip':
        step(TIMING.beforeFlip, flipCard);
        break;
      case 'resolve':
        step(TIMING.beforeResolve, resolveTurn);
        break;
      case 'goStop':
        if (ai) {
          t = setTimeout(() => {
            setGame((g) => {
              if (g !== game) return g;
              const go = aiDecideGo(g);
              say(me.seat.id, go ? '고!' : '스톱!');
              return declareGoStop(g, go);
            });
          }, TIMING.aiGoStop);
        }
        break;
    }
    return () => clearTimeout(t);
  }, [game, setPose, say]);

  // ── 턴 결과 연출: 특수 상황 말풍선, 점수 오르면 기뻐하기 ──────────
  const lastSeq = useRef(0);
  useEffect(() => {
    const r = game?.lastReport;
    if (!r || r.seq === lastSeq.current) return;
    lastSeq.current = r.seq;
    const text = r.specials.map((e) => SPECIAL_TEXT[e]).join(' ');
    if (text) say(r.seatId, text);
    const scored = r.scoreAfter > r.scoreBefore || r.specials.some((e) => e !== 'ppeok');
    if (scored) setPose(r.seatId, 'cheer', TIMING.cheer);
  }, [game?.lastReport, say, setPose]);

  return { game, motion, bubbles, deal, reset, humanPlay, humanChoose, humanGoStop };
}

function omit<T extends Record<string, unknown>>(obj: T, key: string): T {
  const next = { ...obj };
  delete next[key];
  return next;
}
