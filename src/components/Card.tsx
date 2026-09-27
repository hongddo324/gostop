import { useState, type CSSProperties } from 'react';
import { CARD_TYPE_LABEL, MONTH_NAMES, cardImageUrl } from '../game/cards';
import type { CardType, HwatuCard } from '../game/types';

export type CardSize = 'xs' | 'sm' | 'md' | 'lg';

/** 화투 실물 비율 ≈ 2:3.2 */
const SIZE_PX: Record<CardSize, { w: number; h: number; month: string; label: string }> = {
  xs: { w: 30, h: 48, month: 'text-sm', label: 'text-[8px]' },
  sm: { w: 44, h: 70, month: 'text-lg', label: 'text-[9px]' },
  md: { w: 56, h: 90, month: 'text-2xl', label: 'text-[10px]' },
  lg: { w: 70, h: 112, month: 'text-3xl', label: 'text-xs' },
};

const TYPE_BADGE: Record<CardType, string> = {
  gwang: 'bg-amber-500 text-white',
  yeol: 'bg-sky-700 text-white',
  tti: 'bg-rose-600 text-white',
  pi: 'bg-stone-500 text-white',
};

/** 로드 실패한 이미지 URL 캐시 — 같은 카드 재렌더 시 404 재요청/깜빡임 방지 */
const failedImages = new Set<string>();

interface CardProps {
  card?: HwatuCard;
  size?: CardSize;
  faceDown?: boolean;
  className?: string;
  onClick?: () => void;
}

export function Card({ card, size = 'md', faceDown = false, className = '', onClick }: CardProps) {
  const dim = SIZE_PX[size];
  const style = { width: dim.w, height: dim.h };
  const base = `relative shrink-0 rounded-[6px] shadow-[0_2px_4px_rgba(0,0,0,0.45)] ${className}`;

  if (faceDown || !card) {
    return <CardBack style={style} className={base} />;
  }

  return (
    <div
      style={style}
      className={`${base} ${onClick ? 'cursor-pointer transition-transform hover:-translate-y-2' : ''}`}
      onClick={onClick}
      title={card.name}
    >
      <CardFace card={card} size={size} />
    </div>
  );
}

function CardFace({ card, size }: { card: HwatuCard; size: CardSize }) {
  const url = cardImageUrl(card);
  const [failed, setFailed] = useState(() => failedImages.has(url));

  if (!failed) {
    return (
      <img
        src={url}
        alt={card.name}
        draggable={false}
        className="h-full w-full rounded-[6px] object-cover"
        onError={() => {
          failedImages.add(url);
          setFailed(true);
        }}
      />
    );
  }
  return <CardFallback card={card} size={size} />;
}

/** 이미지가 없을 때의 텍스트 카드 */
function CardFallback({ card, size }: { card: HwatuCard; size: CardSize }) {
  const dim = SIZE_PX[size];
  const typeLabel = shortTypeLabel(card);

  return (
    <div className="flex h-full w-full flex-col items-center justify-between overflow-hidden rounded-[6px] border-2 border-card-red bg-card-paper px-0.5 py-1 leading-none text-stone-800">
      <span className={`font-black text-card-red ${dim.month}`}>{card.month}</span>
      {size !== 'xs' && <span className={`font-bold ${dim.label}`}>{MONTH_NAMES[card.month]}</span>}
      <span className={`rounded px-1 py-0.5 font-bold ${dim.label} ${TYPE_BADGE[card.type]}`}>{typeLabel}</span>
    </div>
  );
}

const RIBBON_SHORT = { hong: '홍단', cheong: '청단', cho: '초단', plain: '띠' } as const;

function shortTypeLabel(card: HwatuCard): string {
  if (card.isGodori) return '고도리';
  if (card.ribbon) return RIBBON_SHORT[card.ribbon];
  if (card.piValue === 2) return '쌍피';
  return CARD_TYPE_LABEL[card.type];
}

export function CardBack({ style, className = '' }: { style: CSSProperties; className?: string }) {
  return (
    <div style={style} className={`${className} overflow-hidden border-2 border-[#7a1812] bg-card-back`}>
      <div className="m-[3px] h-[calc(100%-6px)] rounded-[3px] border border-white/30 bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.12)_0_4px,transparent_4px_8px)]" />
    </div>
  );
}
