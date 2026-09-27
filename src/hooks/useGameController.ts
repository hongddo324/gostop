import { useCallback, useEffect, useRef, useState } from 'react';
import { PLAY_RELEASE_MS, PLAY_TOTAL_MS, type CharacterPose } from '../components/CharacterSprite';
import { line, type LineKey } from '../content/dialogue';
import { aiChooseCard, aiChooseTarget, aiDecideGo } from '../game/ai';
import { dealGame } from '../game/deal';
import { choose, currentPlayer, declareGoStop, flipCard, playCard, resolveTurn } from '../game/engine';
import { pickGwangSeller, splitSeats } from '../game/seats';
import type { GameState, SpecialEvent } from '../game/types';

/** 연출 타이밍 (ms) */
export const TIMING = {
  aiThink: 800, // AI 가 패를 고르는 시간
  playPose: PLAY_TOTAL_MS + 120, // 패 치기 8프레임 모션
  beforeFlip: 650, // 낸 패가 날아간 뒤 더미 뒤집기까지
  beforeResolve: 750, // 뒤집은 패 확인 후 먹기까지
  aiChoose: 600,
  aiGoStop: 1300,
  cheer: 1800,
  firstTurnDelay: 2600, // 광 팔기·인사 대사를 읽을 시간
};

/** 대사 확률 — 매 턴 모두 떠들면 정신없으므로 */
const CHANCE = { play: 0.35, capture: 0.45, miss: 0.35, watch: 0.35, robbed: 0.7, otherGo: 0.8 };

export const SPECIAL_TEXT: Record<SpecialEvent, string> = {
  jjok: '쪽!',
  ppeok: '뻑!',
  ttadak: '따닥!',
  ppeokEat: '뻑 먹었다!',
  sweep: '싹쓸이!',
  bonus: '보너스!',
};

export interface Bubble {
  seq: number;
  text: string;
}

/** 말풍선 표시 시간: 글자 수에 비례 */
const bubbleMs = (text: string) => Math.min(4000, 1300 + text.length * 70);

/**
 * 게임 진행 컨트롤러.
 * 엔진(순수 함수)의 단계를 타이머로 이어 붙여 AI 차례/더미 뒤집기/먹기를 자동 진행하고,
 * 사람 차례에는 입력을 기다린다. 캐릭터 모션과 대사(말풍선)도 여기서 관리한다.
 * 판마다 광 팔 사람(=훈수)을 무작위로 뽑는다.
 */
export function useGameController() {
  const [game, setGame] = useState<GameState | null>(null);
  const [motion, setMotion] = useState<Record<string, CharacterPose>>({});
  const [bubbles, setBubbles] = useState<Record<string, Bubble>>({});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const bubbleSeq = useRef(0);
  const gameRef = useRef<GameState | null>(null);
  gameRef.current = game;

  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  const setPose = useCallback(
    (seatId: string, pose: CharacterPose | null, ms?: number) => {
      setMotion((m) => {
        const next = { ...m };
        if (pose) next[seatId] = pose;
        else delete next[seatId];
        return next;
      });
      if (pose && ms) later(ms, () => setMotion((m) => (m[seatId] === pose ? omit(m, seatId) : m)));
    },
    [later],
  );

  const say = useCallback(
    (seatId: string, text: string | undefined, ms?: number) => {
      if (!text) return;
      const seq = ++bubbleSeq.current;
      setBubbles((b) => ({ ...b, [seatId]: { seq, text } }));
      later(ms ?? bubbleMs(text), () => setBubbles((b) => (b[seatId]?.seq === seq ? omit(b, seatId) : b)));
    },
    [later],
  );

  /** 캐릭터 대사 (사람 좌석은 대사 데이터가 없으므로 fallback 만 표시) */
  const speak = useCallback(
    (seatId: string, key: LineKey, vars?: Record<string, string | number>, fallback?: string, delay = 0) => {
      const text = line(seatId, key, vars) ?? fallback;
      if (delay) later(delay, () => say(seatId, text));
      else say(seatId, text);
    },
    [later, say],
  );

  const deal = useCallback(() => {
    clearTimers();
    setMotion({});
    setBubbles({});
    const seller = pickGwangSeller();
    const { players, observer } = splitSeats(seller.id);
    const g = dealGame(players, observer);
    setGame(g);

    // 광 팔기 한마디 → 선의 인사
    const { gwangCount } = g.gwangSale;
    speak(seller.id, gwangCount > 0 ? 'sellGwang' : 'sellNone', { n: gwangCount }, gwangCount > 0 ? `광 ${gwangCount}장 팔았어요!` : '광이 없어서 구경할게요');
    const first = g.players[0]!.seat;
    if (!first.isHuman) speak(first.id, 'greet', {}, undefined, 1200);
    else {
      const other = g.players.find((p) => !p.seat.isHuman)!.seat;
      speak(other.id, 'greet', {}, undefined, 1200);
    }
  }, [clearTimers, speak]);

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
  const humanGoStop = useCallback(
    (go: boolean) => {
      const g = gameRef.current;
      if (!g || g.phase !== 'goStop') return;
      const me = currentPlayer(g);
      say(me.seat.id, go ? '고!' : '스톱!');
      if (go) reactToGo(g, me.seat.id);
      setGame(declareGoStop(g, go));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [say],
  );

  /** 누가 고를 부르면 다른 사람(상대 또는 훈수) 한 명이 반응 */
  const reactToGo = (g: GameState, goerId: string) => {
    if (Math.random() > CHANCE.otherGo) return;
    const others = [...g.players.map((p) => p.seat), g.observer].filter((s) => s.id !== goerId && !s.isHuman);
    const who = others[Math.floor(Math.random() * others.length)];
    if (who) speak(who.id, 'otherGo', {}, undefined, 900);
  };

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
          // 판 첫 차례는 광 팔기·인사 대사를 읽을 시간을 준다
          const think = game.lastReport ? TIMING.aiThink : TIMING.firstTurnDelay;
          // 모션 시작 → '탁' 내려치는 프레임에 맞춰 카드가 손을 떠난다
          t = setTimeout(() => {
            setPose(me.seat.id, 'play', TIMING.playPose);
            if (Math.random() < CHANCE.play) speak(me.seat.id, 'play');
            later(PLAY_RELEASE_MS, () => setGame((g) => (g === game ? playCard(g, aiChooseCard(g).id) : g)));
          }, think);
        }
        break;
      case 'choose':
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
            const g = gameRef.current;
            if (g !== game) return;
            const go = aiDecideGo(g);
            speak(me.seat.id, go ? 'go' : 'stop', {}, go ? '고!' : '스톱!');
            if (go) reactToGo(g, me.seat.id);
            setGame(declareGoStop(g, go));
          }, TIMING.aiGoStop);
        }
        break;
    }
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, setPose, speak, later]);

  // ── 턴 결과 연출: 특수 상황/먹기/헛방 대사, 점수 오르면 기뻐하기, 피 뺏긴 사람 반응 ──
  const lastSeq = useRef(0);
  useEffect(() => {
    const g = game;
    const r = g?.lastReport;
    if (!g || !r || r.seq === lastSeq.current) return;
    lastSeq.current = r.seq;
    const actor = g.players.find((p) => p.seat.id === r.seatId)!.seat;
    const scored = r.scoreAfter > r.scoreBefore;
    const special = r.specials[r.specials.length - 1];

    if (special) {
      const tag = r.specials.map((e) => SPECIAL_TEXT[e]).join(' ');
      const talk = actor.isHuman ? undefined : line(actor.id, special);
      say(actor.id, talk ? `${tag} ${talk.startsWith(tag) ? talk.slice(tag.length).trim() : talk}` : tag);
    } else if (!actor.isHuman) {
      if (scored) speak(actor.id, 'score');
      else if (r.captured.length > 0 && Math.random() < CHANCE.capture) speak(actor.id, 'capture');
      else if (r.captured.length === 0 && Math.random() < CHANCE.miss) speak(actor.id, 'miss');
    }
    if (scored || r.specials.some((e) => e !== 'ppeok')) setPose(r.seatId, 'cheer', TIMING.cheer);

    // 피를 뺏긴 사람 한 명 반응
    const victim = r.stolen.map((x) => x.fromSeatId).find((id) => id !== ME_ID);
    if (victim && Math.random() < CHANCE.robbed) speak(victim, 'robbed', {}, undefined, 900);

    // 훈수석 구경 한마디 (특수 상황이나 점수 날 때)
    if ((special || scored) && Math.random() < CHANCE.watch && !g.observer.isHuman) {
      speak(g.observer.id, 'watch', {}, undefined, 1300);
    }
  }, [game, say, speak, setPose]);

  // ── 판 종료: 승자/패자/나가리 대사 ──
  const endedSeq = useRef<GameState | null>(null);
  useEffect(() => {
    if (!game || game.phase !== 'end' || endedSeq.current === game) return;
    endedSeq.current = game;
    const res = game.result!;
    if (!res.winnerId) {
      game.players.filter((p) => !p.seat.isHuman).forEach((p, i) => speak(p.seat.id, 'nagari', {}, undefined, i * 700));
      return;
    }
    const winner = game.players.find((p) => p.seat.id === res.winnerId)!.seat;
    if (!winner.isHuman) speak(winner.id, 'win', {}, undefined, 600);
    setPose(winner.id, 'cheer', 2600);
    game.players
      .filter((p) => p.seat.id !== res.winnerId && !p.seat.isHuman)
      .forEach((p, i) => speak(p.seat.id, 'lose', {}, undefined, 1500 + i * 900));
  }, [game, speak, setPose]);

  // ── 훈수석 한가한 한마디 (가끔) ──
  useEffect(() => {
    if (!game || game.phase === 'end' || game.observer.isHuman) return;
    const id = setInterval(() => {
      if (Math.random() < 0.5) speak(game.observer.id, 'watch');
    }, 15000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.observer.id, game?.phase === 'end', speak]);

  return { game, motion, bubbles, deal, reset, humanPlay, humanChoose, humanGoStop, speak };
}

const ME_ID = 'me';

function omit<T extends Record<string, unknown>>(obj: T, key: string): T {
  const next = { ...obj };
  delete next[key];
  return next;
}
