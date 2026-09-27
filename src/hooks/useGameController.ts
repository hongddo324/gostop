import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ENTER_TOTAL_MS,
  LEAVE_TOTAL_MS,
  playReleaseMs,
  playTotalMs,
  SAD_TOTAL_MS,
  type CharacterPose,
} from '../components/CharacterSprite';
import type { ChatMessage } from '../components/KakaoChat';
import { line, type LineKey } from '../content/dialogue';
import { aiDecideGo, aiPickCard, aiPickTarget } from '../logic/aiPlayer';
import { difficultyOf, type Settings } from '../settings';
import { dealGame } from '../game/deal';
import { choose, currentPlayer, declareGoStop, flipCard, playCard, resolveTurn } from '../game/engine';
import { pickGwangSeller, splitSeats } from '../game/seats';
import type { GameState, SpecialEvent } from '../game/types';

/**
 * 1배속 기준 연출 타이밍 (ms). 가족끼리 느긋하게 치는 속도. 배속 설정으로 나눈다.
 */
export const BASE_TIMING = {
  aiThink: 1700, // AI 가 패를 고르는 시간
  playFrame: 150, // 패 치기 모션 프레임 간격 (8프레임 ≈ 1.2초)
  beforeFlip: 1300, // 낸 패가 날아간 뒤 더미 뒤집기까지
  beforeResolve: 1400, // 뒤집은 패 확인 후 먹기까지
  aiChoose: 1100,
  aiGoStop: 2000,
  cheer: 2400,
  firstTurnDelay: 3800, // 광 팔기·인사 대사를 읽을 시간
  cardMove: 850, // 카드가 모포 위를 이동하는 시간
};
export type Timing = typeof BASE_TIMING;

export function scaledTiming(speed: number): Timing {
  return Object.fromEntries(Object.entries(BASE_TIMING).map(([k, v]) => [k, Math.round(v / speed)])) as Timing;
}

/** 대사 확률 — 매 턴 모두 떠들면 정신없으므로 */
const CHANCE = { play: 0.35, capture: 0.45, miss: 0.35, watch: 0.35, robbed: 0.7, otherGo: 0.8, praiseMe: 0.55, teaseMe: 0.4 };

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

/** 말풍선 표시 시간: 글자 수에 비례 (배속과 무관하게 읽을 시간 확보) */
const bubbleMs = (text: string) => Math.min(6000, 1800 + text.length * 90);

/**
 * 게임 진행 컨트롤러.
 * 엔진(순수 함수)의 단계를 타이머로 이어 붙여 AI 차례/더미 뒤집기/먹기를 자동 진행하고,
 * 사람 차례에는 입력을 기다린다. 캐릭터 모션과 대사(말풍선)도 여기서 관리한다.
 * 판마다 광 팔 사람(=훈수)을 무작위로 뽑는다.
 */
export function useGameController(settings: Settings) {
  // 설정은 진행 중에도 바뀔 수 있으므로 ref 로 최신값을 읽는다
  const cfg = useRef(settings);
  cfg.current = settings;
  const T = () => scaledTiming(cfg.current.speed);

  const [game, setGame] = useState<GameState | null>(null);
  const [motion, setMotion] = useState<Record<string, CharacterPose>>({});
  const [bubbles, setBubbles] = useState<Record<string, Bubble>>({});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const bubbleSeq = useRef(0);
  /** 광 판 사람이 나가서 자리에 없는지 — 이후 그 사람의 말은 훈수 채팅으로 */
  const [observerGone, setObserverGone] = useState(false);
  const goneRef = useRef(false);
  /** 나가는 중(광 팔기 대사 이후 ~ 사라지기 전)에 한 말은 모아 뒀다가 채팅으로 올린다 */
  const leavingRef = useRef(false);
  const pendingChat = useRef<string[]>([]);
  const [chat, setChat] = useState<ChatMessage[]>([]);
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
      // 나간 광 판 사람의 말 → 훈수 모드일 때만 카톡 채팅, 아니면 아무 말도 안 함
      const isObserver = seatId === gameRef.current?.observer.id;
      if (isObserver && leavingRef.current && !goneRef.current) {
        if (cfg.current.helpMode) pendingChat.current.push(text);
        return;
      }
      if (goneRef.current && isObserver) {
        if (!cfg.current.helpMode) return;
        const time = new Date().toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
        // 자동 훈수와 '훈수 듣기'가 같은 말을 연달아 올리지 않도록
        setChat((c) => (c[c.length - 1]?.text === text ? c : [...c.slice(-9), { seq, text, time }]));
        return;
      }
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
    setChat([]);
    goneRef.current = false;
    leavingRef.current = false;
    pendingChat.current = [];
    setObserverGone(false);
    const prevSeller = gameRef.current?.observer;
    const seller = pickGwangSeller();
    const { players, observer } = splitSeats(seller.id);
    // 선: 첫 판은 무작위, 이후에는 직전 판 승자 (나가리면 직전 선 유지).
    // 선으로 정할 사람이 이번 판에 광을 팔고 빠지면 턴 순서상 다음 사람.
    const prev = gameRef.current;
    const wanted = prev ? (prev.result?.winnerId ?? prev.players[0]!.seat.id) : players[Math.floor(Math.random() * players.length)]!.id;
    const leadId = players.some((p) => p.id === wanted) ? wanted : nextPlayerAfter(wanted, players.map((p) => p.id));
    const g = dealGame(players, observer, Math.random, leadId);
    setGame(g);

    // 광 팔기 한마디 → 선의 인사
    // 광 판 사람은 일어나 걸어 나가고(이후 자리에서 사라짐), 지난 판에 나갔던 사람은 걸어 들어와 앉는다
    setPose(seller.id, 'leave', LEAVE_TOTAL_MS);
    later(LEAVE_TOTAL_MS, () => {
      goneRef.current = true;
      setObserverGone(true);
      // 나가는 동안 하려던 훈수를 채팅으로
      const queued = pendingChat.current;
      pendingChat.current = [];
      queued.forEach((t, i) => later(400 + i * 700, () => say(seller.id, t)));
    });
    if (prevSeller && prevSeller.id !== seller.id) setPose(prevSeller.id, 'enter', ENTER_TOTAL_MS);

    const { gwangCount } = g.gwangSale;
    speak(seller.id, gwangCount > 0 ? 'sellGwang' : 'sellNone', { n: gwangCount }, gwangCount > 0 ? `광 ${gwangCount}장 팔았어요!` : '광이 없어서 구경할게요');
    leavingRef.current = true; // 광 팔기 한마디는 자리에서, 그 뒤 말은 채팅으로
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
          const tm = T();
          const think = game.lastReport ? tm.aiThink : tm.firstTurnDelay;
          // 모션 시작 → '탁' 내려치는 프레임에 맞춰 카드가 손을 떠난다
          t = setTimeout(() => {
            // 모션을 시작하기 전에 결정 (타짜는 시뮬레이션 계산이 있어 모션 중에 하면 끊겨 보인다)
            const card = aiPickCard(game, difficultyOf(cfg.current, me.seat.id));
            setPose(me.seat.id, 'play', playTotalMs(tm.playFrame) + 150);
            if (Math.random() < CHANCE.play) speak(me.seat.id, 'play');
            later(playReleaseMs(tm.playFrame), () => setGame((g) => (g === game ? playCard(g, card.id) : g)));
          }, think);
        }
        break;
      case 'choose':
        if (ai)
          step(T().aiChoose, (g) => choose(g, aiPickTarget(g, difficultyOf(cfg.current, me.seat.id)).id));
        break;
      case 'flip':
        step(T().beforeFlip, flipCard);
        break;
      case 'resolve':
        step(T().beforeResolve, resolveTurn);
        break;
      case 'goStop':
        if (ai) {
          t = setTimeout(() => {
            const g = gameRef.current;
            if (g !== game) return;
            const go = aiDecideGo(g, difficultyOf(cfg.current, me.seat.id));
            speak(me.seat.id, go ? 'go' : 'stop', {}, go ? '고!' : '스톱!');
            if (go) reactToGo(g, me.seat.id);
            setGame(declareGoStop(g, go));
          }, T().aiGoStop);
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
    const bigEvent = scored || r.specials.some((e) => e !== 'ppeok' && e !== 'bonus');
    if (scored || r.specials.some((e) => e !== 'ppeok')) setPose(r.seatId, 'cheer', T().cheer);

    // 남이 점수를 가져가거나 대박(쪽·따닥·싹쓸이 등)이 나면 다른 분들은 아쉬워한다
    // (피를 뺏긴 사람은 무조건, 나머지는 큰 일일 때)
    if (bigEvent || r.stolen.length > 0) {
      const robbed = new Set(r.stolen.map((x) => x.fromSeatId));
      g.players
        .map((p) => p.seat)
        .filter((s) => !s.isHuman && s.id !== r.seatId && (bigEvent || robbed.has(s.id)))
        .forEach((s, i) => later(250 + i * 180, () => setPose(s.id, 'sad', SAD_TOTAL_MS + 200)));
    }

    // 내가 잘하면 칭찬, 헛방/뻑이면 놀림 (훈수석 또는 상대 중 한 명)
    if (actor.isHuman) {
      const good = scored || r.specials.some((e) => e !== 'ppeok' && e !== 'bonus');
      const bad = r.specials.includes('ppeok') || r.captured.length === 0;
      const key: LineKey | undefined = good && Math.random() < CHANCE.praiseMe ? 'praiseMe' : bad && Math.random() < CHANCE.teaseMe ? 'teaseMe' : undefined;
      if (key) {
        const pool = [g.observer, ...g.players.map((p) => p.seat)].filter((s) => !s.isHuman);
        speak(pool[Math.floor(Math.random() * pool.length)]!.id, key, {}, undefined, 700);
      }
    }

    // 피를 뺏긴 사람 한 명 반응
    const victim = r.stolen.map((x) => x.fromSeatId).find((id) => id !== ME_ID);
    if (victim && Math.random() < CHANCE.robbed) speak(victim, 'robbed', {}, undefined, 900);

    // 훈수석(나간 광 판 사람) 구경 한마디 — 카톡으로 (특수 상황이나 점수 날 때)
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
    // 진 분들은 아쉬워하는 모션
    game.players
      .filter((p) => p.seat.id !== res.winnerId && !p.seat.isHuman)
      .forEach((p, i) => later(400 + i * 250, () => setPose(p.seat.id, 'sad', SAD_TOTAL_MS + 400)));
    game.players
      .filter((p) => p.seat.id !== res.winnerId && !p.seat.isHuman)
      .forEach((p, i) => speak(p.seat.id, 'lose', {}, undefined, 1500 + i * 900));
  }, [game, speak, setPose]);

  // ── 훈수석 한가한 한마디 (가끔) ──
  useEffect(() => {
    if (!game || game.phase === 'end' || game.observer.isHuman) return;
    const id = setInterval(() => {
      if (Math.random() < 0.4) speak(game.observer.id, 'watch');
    }, 18000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.observer.id, game?.phase === 'end', speak]);

  return { game, motion, bubbles, chat, observerGone, deal, reset, humanPlay, humanChoose, humanGoStop, speak, say };
}

const ME_ID = 'me';

/** 턴 순서(반시계: 아래→오른쪽→위→왼쪽)에서 seatId 다음으로 오는, ids 안의 좌석 */
function nextPlayerAfter(seatId: string, ids: string[]): string {
  const order = ['me', 'father-in-law', 'uncle', 'grandma'];
  const i = order.indexOf(seatId);
  for (let k = 1; k <= order.length; k++) {
    const id = order[(i + k) % order.length]!;
    if (ids.includes(id)) return id;
  }
  return ids[0]!;
}

function omit<T extends Record<string, unknown>>(obj: T, key: string): T {
  const next = { ...obj };
  delete next[key];
  return next;
}
