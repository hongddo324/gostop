import type { HwatuCard } from '../game/types';
import { Card } from './Card';

interface Props {
  cards: HwatuCard[];
  orientation: 'horizontal' | 'vertical';
  className?: string;
}

/** AI 플레이어 손패 — 뒷면으로 겹쳐서 표시 */
export function OpponentHand({ cards, orientation, className = '' }: Props) {
  const isRow = orientation === 'horizontal';
  return (
    <div className={`absolute flex ${isRow ? 'flex-row' : 'flex-col'} ${className}`}>
      {cards.map((c, i) => (
        <Card
          key={c.id}
          card={c}
          size="sm"
          faceDown
          className={i === 0 ? '' : isRow ? '-ml-6' : '-mt-12'}
        />
      ))}
    </div>
  );
}
