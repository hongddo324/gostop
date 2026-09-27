import { DECK_POS, FIELD_SLOTS } from '../config/layout';
import type { HwatuCard, Month } from '../game/types';
import { Card } from './Card';

interface Props {
  field: HwatuCard[];
  deckCount: number;
  dealt: boolean;
  /** 내가 선택한 카드의 월 — 같은 월 바닥 패를 강조 */
  highlightMonth?: Month;
}

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

/** 배경 모포 위에 얹히는 더미(Deck) + 바닥 패(Field) */
export function Board({ field, deckCount, dealt, highlightMonth }: Props) {
  const groups = groupByMonth(field);

  return (
    <>
      {/* Deck */}
      <div className="absolute flex flex-col items-center" style={{ left: DECK_POS.x, top: DECK_POS.y }}>
        <div className="relative h-[81px] w-[54px]">
          {Array.from({ length: Math.min(deckCount, 5) }, (_, i) => (
            // 두께감 표현용으로 최대 5장만 겹쳐 그린다
            <div key={i} className="absolute" style={{ left: -i * 1.5, top: -i * 1.5 }}>
              <Card size="md" faceDown />
            </div>
          ))}
        </div>
        {dealt && (
          <span className="mt-1 whitespace-nowrap rounded-full bg-black/50 px-2 text-[11px] font-bold text-white">
            더미 {deckCount}장
          </span>
        )}
      </div>

      {/* Field */}
      {groups.map((group, slot) => {
        const pos = FIELD_SLOTS[slot];
        if (!pos) return null; // 12개월 초과는 발생하지 않음
        return (
          <div key={group[0]!.month} className="absolute" style={{ left: pos.x, top: pos.y }}>
            {group.map((c, i) => (
              <div key={c.id} className="absolute" style={{ left: i * 8, top: i * 4 }}>
                <Card card={c} size="md" highlighted={c.month === highlightMonth} />
              </div>
            ))}
          </div>
        );
      })}

      {!dealt && (
        <div className="absolute left-[340px] top-[495px] w-[560px] text-center">
          <span className="rounded-xl bg-black/55 px-5 py-2 text-lg font-bold text-white">
            ‘패 돌리기’를 눌러 시작하세요
          </span>
        </div>
      )}
    </>
  );
}
