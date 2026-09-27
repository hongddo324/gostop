import type { HandPose } from '../config/layout';
import type { HwatuCard } from '../game/types';
import { Card, SIZE_PX } from './Card';

interface Props {
  cards: HwatuCard[];
  pose: HandPose;
}

const SIZE = 'xs';
const { w: CARD_W, h: CARD_H } = SIZE_PX[SIZE];
/** 부채 회전 중심을 카드 아래쪽(손바닥)으로 내린다 */
const PIVOT_BELOW = CARD_H * 0.35;

/**
 * AI 플레이어 손패 — 인물이 손에 쥐고 있는 부채꼴 뒷면.
 * 배경 인물의 방향에 맞춰 perspective + rotateX/Y/Z 로 원근과 기울기를 준다.
 */
export function OpponentHand({ cards, pose }: Props) {
  if (cards.length === 0) return null;

  const n = cards.length;
  const step = n > 1 ? pose.spread / (n - 1) : 0;
  const box = CARD_W * 3.2;

  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: pose.x - box / 2,
        top: pose.y - CARD_H - PIVOT_BELOW,
        width: box,
        height: CARD_H + PIVOT_BELOW,
        transformOrigin: '50% 100%',
        transformStyle: 'preserve-3d',
        transform: `perspective(420px) rotateY(${pose.rotateY}deg) rotateX(${pose.rotateX}deg) rotateZ(${pose.rotateZ}deg)`,
        filter: 'drop-shadow(0 3px 3px rgba(0,0,0,0.35))',
      }}
    >
      {cards.map((c, i) => (
        <div
          key={c.id}
          className="absolute top-0"
          style={{
            left: box / 2 - CARD_W / 2,
            transformOrigin: `50% ${CARD_H + PIVOT_BELOW}px`,
            transform: `rotate(${-pose.spread / 2 + step * i}deg)`,
          }}
        >
          <Card card={c} size={SIZE} faceDown />
        </div>
      ))}
    </div>
  );
}
