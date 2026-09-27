import type { HwatuCard } from '../game/types';
import { Card } from './Card';

interface Props {
  cards: HwatuCard[];
  onSelect?: (card: HwatuCard) => void;
}

/** 하단 내 손패 영역 */
export function MyHand({ cards, onSelect }: Props) {
  return (
    <div className="absolute bottom-3 left-[250px] right-[250px] flex h-[124px] items-end justify-center gap-2 rounded-2xl bg-black/25 px-4 pb-2">
      {cards.length === 0 ? (
        <span className="mb-10 text-sm font-semibold text-white/70">내 손패 영역</span>
      ) : (
        cards.map((c) => <Card key={c.id} card={c} size="lg" onClick={onSelect ? () => onSelect(c) : undefined} />)
      )}
    </div>
  );
}
