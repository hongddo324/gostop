import type { PlayerSeat } from '../game/types';

interface Props {
  seat: PlayerSeat;
  isObserver: boolean;
  handCount?: number;
  className?: string;
}

const AVATAR: Record<string, string> = {
  me: '🙂',
  grandma: '👵',
  'father-in-law': '👴',
  uncle: '🧔',
};

/** 캐릭터 자리 (임시 플레이스홀더). 추후 캐릭터 일러스트/애니메이션으로 교체. */
export function CharacterSeat({ seat, isObserver, handCount, className = '' }: Props) {
  return (
    <div className={`absolute flex w-[112px] flex-col items-center ${className}`}>
      {isObserver && (
        <div className="relative mb-1 whitespace-nowrap rounded-xl bg-white px-2 py-1 text-[11px] font-bold text-stone-700 shadow">
          허허, 잘 보고 내야지~
          <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-white" />
        </div>
      )}
      <div
        className={`flex h-[84px] w-[84px] items-center justify-center rounded-2xl border-2 border-dashed text-4xl ${
          isObserver ? 'border-white/60 bg-black/20 opacity-80' : 'border-amber-100 bg-black/30'
        }`}
      >
        {AVATAR[seat.id] ?? '👤'}
      </div>
      <div className="mt-1 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-0.5 text-sm font-bold text-white">
        {seat.name}
        <span
          className={`rounded px-1 text-[10px] ${
            isObserver ? 'bg-violet-500' : seat.isHuman ? 'bg-emerald-500' : 'bg-sky-600'
          }`}
        >
          {isObserver ? '훈수' : seat.isHuman ? '나' : 'AI'}
        </span>
      </div>
      {handCount !== undefined && !isObserver && (
        <div className="mt-0.5 text-[11px] font-semibold text-white drop-shadow">손패 {handCount}장</div>
      )}
    </div>
  );
}
