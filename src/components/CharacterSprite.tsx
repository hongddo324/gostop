import { useEffect, useState } from 'react';
import FRAMES from '../config/characterFrames.json';

/** 캐릭터 모션 상태 */
export type CharacterPose = 'idle' | 'rest' | 'play' | 'cheer' | 'observe' | 'sad' | 'leave' | 'enter' | 'gone';

type FrameMeta = { width: number; height: number; anchorX: number; anchorY: number; bodyHeight: number };

/**
 * 패 치기 8프레임: 1 대기 → 2 고르기 → 3 들기 → 4 높이 들기 → 5 내려치기 → 6 바닥에 탁 → 7 돌아오기 → 8 대기
 * 'play' 포즈는 2~8 을 frameMs 간격으로 한 번 재생한다 (배속에 따라 frameMs 가 바뀐다).
 */
const PLAY_SEQ = [2, 3, 4, 5, 6, 6, 7, 8];
/** 카드가 손을 떠나는 시점 (6번 '탁' 프레임) */
export const playReleaseMs = (frameMs: number) => PLAY_SEQ.indexOf(6) * frameMs;
export const playTotalMs = (frameMs: number) => PLAY_SEQ.length * frameMs;

const CHEER_SEQ = ['cheer-1', 'cheer-2', 'cheer-3', 'cheer-2'];
/** 아쉬움 8프레임: 1 멍 → 2~3 말하며 손짓 → 4~6 볼 감싸고 한숨 → 7 손짓 → 8 체념 */
const SAD_SEQ = [1, 2, 3, 4, 5, 6, 5, 6, 7, 8];
/** 아쉬움 모션 1프레임 시간 (배속 무관 — 표정을 읽을 수 있게) */
export const SAD_FRAME_MS = 170;
export const SAD_TOTAL_MS = SAD_SEQ.length * SAD_FRAME_MS;
/**
 * 광 팔고 나가기: 1 앉음 → 2 손 짚기 → 3 무릎 → 4 일어섬 → 5 허리 숙임 → 6 섬 → 7 걷기 → 8 뒷모습
 * 8프레임 재생 후 걷는 프레임(7↔8)을 번갈아 보여주며 옆으로 이동하면서 사라진다.
 * 들어오기(enter)는 반대로: 걸어 들어와서 6 → 1 로 앉는다.
 */
const LEAVE_FRAME_MS = 210;
const WALK_MS = 1100;
const WALK_STEP_MS = 260;
export const LEAVE_TOTAL_MS = 8 * LEAVE_FRAME_MS + WALK_MS;
export const ENTER_TOTAL_MS = WALK_MS + 6 * LEAVE_FRAME_MS;

const ALL_FRAMES = [
  ...Array.from({ length: 8 }, (_, i) => `play-${i + 1}`),
  'cheer-1',
  'cheer-2',
  'cheer-3',
  ...Array.from({ length: 8 }, (_, i) => `sad-${i + 1}`),
  ...Array.from({ length: 8 }, (_, i) => `leave-${i + 1}`),
  ...Array.from({ length: 8 }, (_, i) => `rest-${i + 1}`),
];

const frameUrl = (seatId: string, f: string) => `${import.meta.env.BASE_URL}assets/characters/${seatId}/${f}.webp`;

interface Props {
  seatId: string;
  pose: CharacterPose;
  /** 앉은 자리 기준점 */
  x: number;
  y: number;
  /** 표시 키(px) */
  height: number;
  /** 패 치기 프레임 간격(ms) */
  frameMs: number;
  /** 나가기/들어오기 때 걸어가는 가로 거리(px, 음수=왼쪽) */
  exitDx: number;
}

/**
 * 배경과 분리된 캐릭터 스프라이트.
 *  - idle   : 패 들고 대기 (1 ↔ 8 을 불규칙하게 오가며 자연스럽게)
 *  - rest   : 패 없이 쉬는 대기 8프레임 — 판 시작 전·판 종료 후·손패를 다 냈을 때
 *  - play   : 패를 골라 들어 올렸다가 '탁' 내려치는 8프레임 모션
 *  - cheer  : 득점 시 좋아하는 모션 루프
 *  - observe: 훈수 좌석 — 패 없이 앉아 있는 프레임
 *  - sad    : 남이 점수를 가져가거나 대박이 났을 때 아쉬워하는 8프레임 (한 번 재생)
 *  - leave  : 광 팔고 일어나 걸어 나가며 사라짐 → 이후 gone(안 보임)
 *  - enter  : 다음 판에 걸어 들어와 앉기
 */
export function CharacterSprite({ seatId, pose, x, y, height, frameMs, exitDx }: Props) {
  const meta = (FRAMES as Record<string, FrameMeta>)[seatId];
  const frame = useFrame(pose, frameMs);
  const walk = useWalk(pose, exitDx);

  // 모션 중 깜빡임 방지용 프리로드
  useEffect(() => {
    ALL_FRAMES.forEach((f) => {
      const img = new Image();
      img.src = frameUrl(seatId, f);
    });
  }, [seatId]);

  if (!meta || pose === 'gone') return null;
  const scale = height / meta.bodyHeight;

  return (
    <img
      src={frameUrl(seatId, frame)}
      alt=""
      draggable={false}
      className="pointer-events-none absolute max-w-none select-none drop-shadow-[0_6px_6px_rgba(0,0,0,0.18)]"
      style={{
        width: meta.width * scale,
        height: meta.height * scale,
        left: x - meta.anchorX * scale,
        top: y - meta.anchorY * scale,
        transform: `translateX(${walk.dx}px)`,
        opacity: walk.opacity,
        transition: `transform ${walk.ms}ms linear, opacity ${walk.ms}ms ease-in`,
      }}
    />
  );
}

function useFrame(pose: CharacterPose, frameMs: number): string {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setTick(0);
    if (pose === 'cheer') {
      const id = setInterval(() => setTick((t) => t + 1), 230);
      return () => clearInterval(id);
    }
    if (pose === 'leave' || pose === 'enter') {
      // tick = 경과 시간(ms). 일어서기/걷기 구간의 프레임 간격이 달라 시간으로 프레임을 정한다
      const start = performance.now();
      const id = setInterval(() => setTick(Math.floor(performance.now() - start)), 60);
      return () => clearInterval(id);
    }
    if (pose === 'sad') {
      const id = setInterval(() => setTick((t) => Math.min(t + 1, SAD_SEQ.length - 1)), SAD_FRAME_MS);
      return () => clearInterval(id);
    }
    if (pose === 'play') {
      const id = setInterval(() => setTick((t) => Math.min(t + 1, PLAY_SEQ.length - 1)), frameMs);
      return () => clearInterval(id);
    }
    if (pose === 'rest') {
      // 쉬는 대기: 이웃 프레임으로 천천히 움직이다 가끔 다른 표정으로 넘어가고, 중간중간 멈춰 있는다
      let timer: ReturnType<typeof setTimeout>;
      let cur = Math.floor(Math.random() * 8);
      setTick(cur);
      const next = () => {
        const r = Math.random();
        if (r < 0.2) cur = Math.floor(Math.random() * 8);
        else cur = Math.min(7, Math.max(0, cur + (r < 0.6 ? 1 : -1)));
        setTick(cur);
        const hold = Math.random() < 0.3 ? 1400 + Math.random() * 1800 : 320 + Math.random() * 280;
        timer = setTimeout(next, hold);
      };
      timer = setTimeout(next, 600 + Math.random() * 1200);
      return () => clearTimeout(timer);
    }
    if (pose === 'idle') {
      // 2~4.5초 간격으로 대기 자세를 바꿔 살아있는 느낌
      let timer: ReturnType<typeof setTimeout>;
      const next = () => {
        timer = setTimeout(() => {
          setTick((t) => t + 1);
          next();
        }, 2000 + Math.random() * 2500);
      };
      next();
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pose]);

  switch (pose) {
    case 'play':
      return `play-${PLAY_SEQ[Math.min(tick, PLAY_SEQ.length - 1)]}`;
    case 'cheer':
      return CHEER_SEQ[tick % CHEER_SEQ.length]!;
    case 'sad':
      return `sad-${SAD_SEQ[Math.min(tick, SAD_SEQ.length - 1)]}`;
    case 'leave': {
      // tick = 경과 ms
      if (tick < 8 * LEAVE_FRAME_MS) return `leave-${Math.floor(tick / LEAVE_FRAME_MS) + 1}`;
      return Math.floor((tick - 8 * LEAVE_FRAME_MS) / WALK_STEP_MS) % 2 === 0 ? 'leave-7' : 'leave-8';
    }
    case 'enter': {
      if (tick < WALK_MS) return Math.floor(tick / WALK_STEP_MS) % 2 === 0 ? 'leave-7' : 'leave-6';
      const k = Math.min(5, Math.floor((tick - WALK_MS) / LEAVE_FRAME_MS)); // 6 → 1
      return `leave-${6 - k}`;
    }
    case 'gone':
      return 'play-1';
    case 'observe':
      return 'cheer-3';
    case 'rest':
      return `rest-${(tick % 8) + 1}`;
    case 'idle':
      return tick % 2 === 0 ? 'play-1' : 'play-8';
  }
}

/** 나가기/들어오기의 가로 이동 + 투명도 */
function useWalk(pose: CharacterPose, exitDx: number): { dx: number; opacity: number; ms: number } {
  const [state, setState] = useState({ dx: 0, opacity: 1, ms: 0 });
  useEffect(() => {
    if (pose === 'leave') {
      setState({ dx: 0, opacity: 1, ms: 0 });
      // 일어선 뒤 걸어 나가며 사라짐
      const t = setTimeout(() => setState({ dx: exitDx, opacity: 0, ms: WALK_MS }), 8 * LEAVE_FRAME_MS);
      return () => clearTimeout(t);
    }
    if (pose === 'enter') {
      // 바깥에서 시작 → 자리로 걸어 들어옴
      setState({ dx: exitDx, opacity: 0, ms: 0 });
      const t = setTimeout(() => setState({ dx: 0, opacity: 1, ms: WALK_MS }), 30);
      return () => clearTimeout(t);
    }
    setState({ dx: 0, opacity: 1, ms: 0 });
  }, [pose, exitDx]);
  return state;
}
