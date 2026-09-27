import { CAPTURE_LAYOUT, DECK_POS, FIELD_SLOTS, MAT_CARD, MAT_H, MAT_QUAD, MAT_W, PILE_CARD } from '../config/layout';
import type { PileRect } from '../config/layout';
import { rectToQuadMatrix3d } from '../lib/homography';
import type { CardType, HwatuCard, Month, SeatPosition } from '../game/types';
import { Card } from './Card';

export interface SeatCaptures {
  position: SeatPosition;
  name: string;
  cards: HwatuCard[];
}

/** 카드 확대 보기 요청 (탭한 카드 묶음) */
export type InspectHandler = (title: string, cards: HwatuCard[]) => void;

interface Props {
  field: HwatuCard[];
  deckCount: number;
  captures: SeatCaptures[];
  /** 내가 선택한 카드의 월 — 같은 월 바닥 패를 강조 */
  highlightMonth?: Month;
  onInspect: InspectHandler;
}

/** 모포 평면 → 배경 사다리꼴 투영 (한 번만 계산) */
const MAT_TRANSFORM = rectToQuadMatrix3d(MAT_W, MAT_H, MAT_QUAD);

const TYPES: CardType[] = ['gwang', 'yeol', 'tti', 'pi'];
const TYPE_NAME: Record<CardType, string> = { gwang: '광', yeol: '열끗', tti: '띠', pi: '피' };

/** 같은 월끼리 한 자리에 겹쳐 놓는다 (실제 바닥 패 배치 방식) */
function groupByMonth(cards: HwatuCard[]): HwatuCard[][] {
  const groups = new Map<Month, HwatuCard[]>();
  for (const c of cards) {
    const g = groups.get(c.month);
    if (g) g.push(c);
    else groups.set(c.month, [c]);
  }
  return [...groups.values()];
}

/**
 * 모포 위에 놓이는 모든 카드(바닥 패, 더미, 득점 패).
 * 내부는 평평한 MAT_W × MAT_H 좌표로 배치하고, 컨테이너에 matrix3d 를 걸어
 * 배경 모포의 기울기/원근에 그대로 눕힌다.
 */
export function Board({ field, deckCount, captures, highlightMonth, onInspect }: Props) {
  const groups = groupByMonth(field);

  return (
    <div
      className="pointer-events-none absolute left-0 top-0"
      style={{ width: MAT_W, height: MAT_H, transformOrigin: '0 0', transform: MAT_TRANSFORM }}
    >
      {/* 더미 */}
      <div className="absolute" style={{ left: DECK_POS.x, top: DECK_POS.y }}>
        {Array.from({ length: Math.min(deckCount, 6) }, (_, i) => (
          // 두께감 표현용으로 최대 6장만 겹쳐 그린다
          <div key={i} className="absolute" style={{ left: -i * 1.2, top: -i * 1.8 }}>
            <Card size={MAT_CARD} faceDown />
          </div>
        ))}
        {deckCount > 0 && (
          // 장수는 맨 윗장 위에 표시 (주변 바닥 패와 겹치지 않도록)
          <span
            className="absolute flex items-center justify-center text-[22px] font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
            style={{
              left: -Math.min(deckCount - 1, 5) * 1.2,
              top: -Math.min(deckCount - 1, 5) * 1.8,
              width: MAT_CARD.w,
              height: MAT_CARD.h,
            }}
          >
            {deckCount}
          </span>
        )}
      </div>

      {/* 바닥 패 */}
      {groups.map((group, slot) => {
        const pos = FIELD_SLOTS[slot];
        if (!pos) return null; // 12개월 초과는 발생하지 않음
        return (
          <div
            key={group[0]!.month}
            className="pointer-events-auto absolute cursor-zoom-in"
            onClick={() => onInspect(`바닥 패 · ${group[0]!.month}월`, group)}
            style={{ left: pos.x - MAT_CARD.w / 2, top: pos.y - MAT_CARD.h / 2 }}
          >
            {group.map((c, i) => (
              <div key={c.id} className="absolute" style={{ left: i * 10, top: i * 5 }}>
                <Card card={c} size={MAT_CARD} highlighted={c.month === highlightMonth} />
              </div>
            ))}
          </div>
        );
      })}

      {/* 득점 패 — 각자 앞 가장자리 */}
      {captures.map(({ position, name, cards }) =>
        TYPES.map((type) => {
          const pile = cards.filter((c) => c.type === type);
          return (
            <Pile
              key={`${position}-${type}`}
              rect={CAPTURE_LAYOUT[position][type]}
              cards={pile}
              onClick={() => onInspect(`${name} · ${TYPE_NAME[type]} ${pile.length}장`, pile)}
            />
          );
        }),
      )}
    </div>
  );
}

/** 종류별 득점 패 한 줄. 장수가 많으면 겹침 간격을 줄여 영역 폭 안에 맞춘다. */
function Pile({ rect, cards, onClick }: { rect: PileRect; cards: HwatuCard[]; onClick: () => void }) {
  if (cards.length === 0) return null;
  const step = cards.length > 1 ? Math.min(PILE_CARD.w * 0.55, (rect.w - PILE_CARD.w) / (cards.length - 1)) : 0;

  return (
    <div
      className="pointer-events-auto absolute cursor-zoom-in"
      style={{ left: rect.x, top: rect.y, width: rect.w, height: PILE_CARD.h }}
      onClick={onClick}
    >
      {cards.map((c, i) => (
        <div key={c.id} className="absolute" style={{ left: i * step }}>
          <Card card={c} size={PILE_CARD} />
        </div>
      ))}
    </div>
  );
}
