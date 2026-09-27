import { useState } from 'react';
import type { HwatuCard } from '../game/types';
import { Card } from './Card';

/** 트레이 카드 크기 — 오른쪽 아래에 두어 모포 앞쪽(내 득점 패)을 가리지 않는다 */
const HAND_CARD = { w: 70, h: 105 };

interface Props {
  cards: HwatuCard[];
  selectedId: string | null;
  onSelect: (card: HwatuCard) => void;
}

/**
 * 내 손패 전용 패널 — 1인칭 시점이라 게임 장면과 분리된 오른쪽 아래 트레이로 크게 보여준다.
 * (오른손 엄지로 조작하기 쉬운 위치, 모포 왼쪽 앞은 내 득점 패 자리)
 * 접으면 장면(모포) 전체를 볼 수 있다.
 */
export function MyHand({ cards, selectedId, onSelect }: Props) {
  const [open, setOpen] = useState(true);
  const selected = cards.find((c) => c.id === selectedId);
  const TRAY_H = 118;

  return (
    <div
      className="absolute bottom-0 right-2 w-[570px] transition-transform duration-300"
      style={{ transform: `translateY(${open ? 0 : TRAY_H}px)` }}
    >
      {/* 탭 */}
      <div className="flex items-end justify-between px-5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-[26px] items-center gap-2 rounded-t-lg bg-[#4a2e1a] px-3 text-xs font-bold text-amber-100"
        >
          내 패 <span className="rounded bg-emerald-500 px-1 text-[10px] text-white">{cards.length}장</span>
          <span className="opacity-70">{open ? '▼ 접기' : '▲ 펼치기'}</span>
        </button>
        {selected && (
          <span className="mb-1 rounded-full bg-black/60 px-3 py-0.5 text-xs font-bold text-amber-300">
            선택: {selected.name}
          </span>
        )}
      </div>

      {/* 트레이 */}
      <div style={{ height: TRAY_H }}
        className="flex items-end justify-center gap-1.5 rounded-t-2xl border-t-2 border-x-2 border-[#8a5a33] bg-gradient-to-b from-[#6b4327] to-[#3e2615] px-4 pb-[6px] shadow-[0_-6px_16px_rgba(0,0,0,0.35)]">
        {cards.length === 0 ? (
          <span className="mb-11 text-sm font-semibold text-amber-100/70">패를 돌리면 여기에 내 패가 표시됩니다</span>
        ) : (
          cards.map((c) => (
            <Card key={c.id} card={c} size={HAND_CARD} selected={c.id === selectedId} onClick={() => onSelect(c)} />
          ))
        )}
      </div>
    </div>
  );
}
