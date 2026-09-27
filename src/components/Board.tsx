import type { HwatuCard, Month } from '../game/types';
import { Card } from './Card';

interface Props {
  field: HwatuCard[];
  deckCount: number;
  dealt: boolean;
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

/** 중앙 모포: 좌측 더미(Deck) + 바닥 패(Field) */
export function Board({ field, deckCount, dealt }: Props) {
  const groups = groupByMonth(field);

  return (
    <div className="absolute left-[270px] top-[190px] h-[290px] w-[740px] rounded-[28px] border-[6px] border-mat-dark bg-mat shadow-[0_10px_24px_rgba(0,0,0,0.45)]">
      {/* 모포 질감 */}
      <div className="pointer-events-none absolute inset-0 rounded-[22px] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.10),transparent_70%)]" />

      {/* Deck 영역 */}
      <div className="absolute left-6 top-1/2 flex -translate-y-1/2 flex-col items-center">
        <div className="relative h-[90px] w-[56px]">
          {deckCount > 0 ? (
            // 두께감 표현용으로 최대 5장만 겹쳐 그린다
            Array.from({ length: Math.min(deckCount, 5) }, (_, i) => (
              <div key={i} className="absolute" style={{ left: -i * 1.5, top: -i * 1.5 }}>
                <Card size="md" faceDown />
              </div>
            ))
          ) : (
            <div className="h-full w-full rounded-[6px] border-2 border-dashed border-white/40" />
          )}
        </div>
        <span className="mt-2 rounded-full bg-black/40 px-2 text-xs font-bold text-white">더미 {deckCount}장</span>
      </div>

      {/* Field 영역: 12칸 (2행 × 6열) */}
      <div className="absolute left-[120px] right-5 top-1/2 grid -translate-y-1/2 grid-cols-6 grid-rows-2 gap-x-3 gap-y-4">
        {Array.from({ length: 12 }).map((_, slot) => {
          const group = groups[slot];
          return (
            <div key={slot} className="relative flex h-[90px] items-center justify-center rounded-md bg-black/10">
              {group?.map((c, i) => (
                <div key={c.id} className="absolute" style={{ transform: `translate(${i * 8}px, ${i * 4}px)` }}>
                  <Card card={c} size="md" />
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {!dealt && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="rounded-xl bg-black/50 px-5 py-2 text-lg font-bold text-white">
            ‘패 돌리기’를 눌러 시작하세요
          </span>
        </div>
      )}
    </div>
  );
}
