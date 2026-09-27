import type { HwatuCard } from '../game/types';
import { Card } from './Card';

interface Props {
  cards: HwatuCard[];
  onSelect?: (card: HwatuCard) => void;
}

/** 하단 내 손패 — 1인칭 시점이라 모포 앞쪽 가장자리에 살짝 겹쳐 놓인다 */
export function MyHand({ cards, onSelect }: Props) {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[110px] bg-gradient-to-t from-black/35 to-transparent" />
      <div className="absolute inset-x-0 bottom-[6px] flex justify-center gap-2">
        {cards.map((c) => (
          <Card key={c.id} card={c} size="lg" onClick={onSelect ? () => onSelect(c) : undefined} />
        ))}
      </div>
    </>
  );
}
