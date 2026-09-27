import { useEffect, useState } from 'react';
import FRAMES from '../config/characterFrames.json';

/** 캐릭터 모션 상태 */
export type CharacterPose = 'idle' | 'play' | 'cheer' | 'observe';

type FrameName = 'play-1' | 'play-2' | 'play-3' | 'cheer-1' | 'cheer-2' | 'cheer-3';
type FrameMeta = { width: number; height: number; anchorX: number; anchorY: number; bodyHeight: number };

const frameUrl = (seatId: string, f: FrameName) =>
  `${import.meta.env.BASE_URL}assets/characters/${seatId}/${f}.webp`;

const ALL_FRAMES: FrameName[] = ['play-1', 'play-2', 'play-3', 'cheer-1', 'cheer-2', 'cheer-3'];
const CHEER_LOOP: FrameName[] = ['cheer-1', 'cheer-2', 'cheer-3', 'cheer-2'];

interface Props {
  seatId: string;
  pose: CharacterPose;
  /** 앉은 자리 기준점(스테이지 좌표) */
  x: number;
  y: number;
  /** 표시 키(px) */
  height: number;
}

/**
 * 배경과 분리된 캐릭터 스프라이트.
 *  - idle   : 패 들고 대기 (play-1 ↔ play-3 을 불규칙하게 오가며 자연스럽게)
 *  - play   : 패 내기 (play-2)
 *  - cheer  : 득점 시 좋아하는 모션 루프 (cheer-1→2→3→2)
 *  - observe: 훈수 좌석 — 패 없이 앉아 있는 프레임(cheer-3)
 */
export function CharacterSprite({ seatId, pose, x, y, height }: Props) {
  const meta = (FRAMES as Record<string, FrameMeta>)[seatId];
  const frame = useFrame(pose);

  // 첫 전환 시 깜빡임 방지용 프리로드
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

function useFrame(pose: CharacterPose): FrameName {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setTick(0);
    if (pose === 'cheer') {
      const id = setInterval(() => setTick((t) => t + 1), 200);
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
  }, [pose]);

  switch (pose) {
    case 'play':
      return 'play-2';
    case 'cheer':
      return CHEER_LOOP[tick % CHEER_LOOP.length]!;
    case 'observe':
      return 'cheer-3';
    case 'idle':
      return tick % 2 === 0 ? 'play-1' : 'play-3';
  }
}
