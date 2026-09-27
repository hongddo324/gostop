import { useEffect, useState } from 'react';
import FRAMES from '../config/characterFrames.json';

/** 캐릭터 모션 상태 */
export type CharacterPose = 'idle' | 'play' | 'cheer' | 'observe';

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
const ALL_FRAMES = [...Array.from({ length: 8 }, (_, i) => `play-${i + 1}`), 'cheer-1', 'cheer-2', 'cheer-3'];

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
}

/**
 * 배경과 분리된 캐릭터 스프라이트.
 *  - idle   : 패 들고 대기 (1 ↔ 8 을 불규칙하게 오가며 자연스럽게)
 *  - play   : 패를 골라 들어 올렸다가 '탁' 내려치는 8프레임 모션
 *  - cheer  : 득점 시 좋아하는 모션 루프
 *  - observe: 훈수 좌석 — 패 없이 앉아 있는 프레임
 */
export function CharacterSprite({ seatId, pose, x, y, height, frameMs }: Props) {
  const meta = (FRAMES as Record<string, FrameMeta>)[seatId];
  const frame = useFrame(pose, frameMs);

  // 모션 중 깜빡임 방지용 프리로드
  useEffect(() => {
    ALL_FRAMES.forEach((f) => {
      const img = new Image();
      img.src = frameUrl(seatId, f);
    });
  }, [seatId]);

  if (!meta) return null;
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
    if (pose === 'play') {
      const id = setInterval(() => setTick((t) => Math.min(t + 1, PLAY_SEQ.length - 1)), frameMs);
      return () => clearInterval(id);
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
    case 'observe':
      return 'cheer-3';
    case 'idle':
      return tick % 2 === 0 ? 'play-1' : 'play-8';
  }
}
