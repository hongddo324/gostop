import type { HwatuCard } from '../game/types';
import { Card } from './Card';

interface Props {
  cards: HwatuCard[];
  x: number;
  y: number;
}

/** AI 플레이어 손패 — 인물 옆 바닥에 뒷면으로 겹쳐 표시 */
export function OpponentHand({ cards, x, y }: Props) {
  return (
    <div className="absolute flex" style={{ left: x, top: y }}>
      {cards.map((c, i) => (
        <Card key={c.id} card={c} size="sm" faceDown className={i === 0 ? '' : '-ml-[26px]'} />
      ))}
    </div>
  );
}
