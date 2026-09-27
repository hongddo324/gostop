import type { PlayerSeat } from '../game/types';

interface Props {
  seat: PlayerSeat;
  isObserver: boolean;
  handCount?: number;
  /** 이름표 중심 x, 상단 y */
  x: number;
  y: number;
}

/**
 * 좌석 이름표. 캐릭터 본체는 배경 일러스트에 포함되어 있으므로 여기서는 이름/역할만 표시한다.
 * 추후 표정·말풍선·턴 표시 등 캐릭터 연출은 이 컴포넌트에서 확장.
 */
export function CharacterSeat({ seat, isObserver, handCount, x, y }: Props) {
  return (
    <div className="absolute flex -translate-x-1/2 flex-col items-center" style={{ left: x, top: y }}>
      {isObserver && (
        <div className="relative mb-1 whitespace-nowrap rounded-xl bg-white px-2 py-1 text-[11px] font-bold text-stone-700 shadow">
          허허, 잘 보고 내야지~
          <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-white" />
        </div>
      )}
      <div className="flex items-center gap-1 whitespace-nowrap rounded-full bg-black/60 px-2.5 py-0.5 text-sm font-bold text-white shadow">
        {seat.name}
        <span
          className={`rounded px-1 text-[10px] ${
            isObserver ? 'bg-violet-500' : seat.isHuman ? 'bg-emerald-500' : 'bg-sky-600'
          }`}
        >
          {isObserver ? '훈수' : seat.isHuman ? '나' : 'AI'}
        </span>
        {handCount !== undefined && !isObserver && (
          <span className="text-[11px] font-semibold opacity-80">{handCount}장</span>
        )}
      </div>
    </div>
  );
}
