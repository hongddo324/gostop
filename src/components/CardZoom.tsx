import type { HwatuCard } from '../game/types';
import { Card } from './Card';

interface Props {
  title: string;
  cards: HwatuCard[];
  onClose: () => void;
}

const ZOOM_CARD = { w: 120, h: 180 };

/** 모포 위 카드 확대 보기 — 원근 때문에 작게 보이는 카드를 탭해서 크게 확인 */
export function CardZoom({ title, cards, onClose }: Props) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/55" onClick={onClose}>
      <div className="max-w-[1100px] rounded-2xl bg-[#3e2615]/95 px-6 pb-5 pt-3 shadow-2xl">
        <div className="mb-3 flex items-center justify-between gap-6 text-amber-100">
          <span className="text-lg font-black">{title}</span>
          <span className="text-xs opacity-70">아무 곳이나 누르면 닫힘</span>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {cards.map((c) => (
            <div key={c.id} className="flex flex-col items-center gap-1">
              <Card card={c} size={ZOOM_CARD} />
              <span className="text-xs font-bold text-amber-100">{c.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
