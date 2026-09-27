import type { PlayerSeat } from '../game/types';

interface Props {
  seat: PlayerSeat;
  isObserver: boolean;
  /** 현재 차례 */
  isTurn?: boolean;
  handCount?: number;
  score?: number;
  goCount?: number;
  /** 말풍선 (쪽!/뻑!/고!/훈수 등) */
  bubble?: string;
  /** 광 판 사람이면 판 광 장수 */
  gwangCount?: number;
  /** 이름표 중심 x, 상단 y */
  x: number;
  y: number;
}

/** 좌석 이름표 — 이름/역할/점수/고 횟수/차례 표시 + 말풍선 */
export function CharacterSeat({ seat, isObserver, isTurn, handCount, score, goCount, bubble, gwangCount, x, y }: Props) {
  return (
    <div className="pointer-events-none absolute z-40 flex -translate-x-1/2 flex-col items-center" style={{ left: x, top: y }}>
      {bubble && (
        <div
          key={bubble}
          className="relative mb-1 w-max max-w-[240px] animate-[pop_.25s_ease-out] break-keep rounded-xl bg-white px-3 py-1 text-center text-sm font-bold leading-snug text-stone-800 shadow-lg"
        >
          {bubble}
          <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-white" />
        </div>
      )}
      <div
        className={`flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-sm font-bold text-white shadow transition-colors ${
          isTurn ? 'bg-amber-500 ring-2 ring-amber-200' : 'bg-black/60'
        }`}
      >
        {seat.name}
        <span
          className={`rounded px-1 text-[10px] ${
            isObserver ? 'bg-violet-500' : seat.isHuman ? 'bg-emerald-500' : 'bg-sky-600'
          }`}
        >
          {isObserver ? '광·훈수' : seat.isHuman ? '나' : 'AI'}
        </span>
        {isObserver && gwangCount !== undefined && (
          <span className="text-[11px] text-amber-200">{gwangCount > 0 ? `광 ${gwangCount}` : '광 없음'}</span>
        )}
        {score !== undefined && !isObserver && <span className="text-amber-200">{score}점</span>}
        {!!goCount && <span className="rounded bg-rose-600 px-1 text-[10px]">{goCount}고</span>}
        {handCount !== undefined && !isObserver && (
          <span className="text-[11px] font-semibold opacity-80">· {handCount}장</span>
        )}
      </div>
    </div>
  );
}
