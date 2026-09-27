import { HAND_PANEL_H } from '../config/stage';
import type { HwatuCard } from '../game/types';
import { Card } from './Card';

/** 손패 카드 크기 */
const HAND_CARD = { w: 64, h: 96 };

interface Props {
  cards: HwatuCard[];
  selectedId: string | null;
  /** 내 차례에만 낼 수 있음 */
  myTurn: boolean;
  score?: number;
  goCount?: number;
  /** 내가 광 판 사람일 때 받았던 7장 (구경 모드) */
  soldHand?: HwatuCard[];
  onSelect: (card: HwatuCard) => void;
  onPlay: (card: HwatuCard) => void;
  /** 도움 모드: 훈수 듣기 (없으면 버튼 숨김) */
  onHint?: () => void;
  /** 훈수 추천 패 (초록 테두리) */
  recommendedId?: string;
}

/**
 * 내 손패 전용 패널 — 게임 장면 아래 별도 공간 (모포를 가리지 않음).
 * 조작: 한 번 탭 = 선택(같은 월 바닥 패 강조), 선택한 패를 한 번 더 탭 또는 '내기' = 내기.
 */
export function MyHand({ cards, selectedId, myTurn, score, goCount, soldHand, onSelect, onPlay, onHint, recommendedId }: Props) {
  if (soldHand) return <SoldPanel hand={soldHand} />;
  const selected = cards.find((c) => c.id === selectedId);

  return (
    <div
      className={`absolute inset-x-0 bottom-0 z-40 flex items-center gap-4 border-t-4 bg-gradient-to-b from-[#6b4327] to-[#3a2313] px-5 shadow-[0_-6px_16px_rgba(0,0,0,0.35)] transition-colors ${
        myTurn ? 'border-amber-400' : 'border-[#8a5a33]'
      }`}
      style={{ height: HAND_PANEL_H }}
    >
      {/* 내 정보 */}
      <div className="flex w-[150px] shrink-0 flex-col gap-1 text-amber-50">
        <div className="flex items-center gap-1.5 text-lg font-black">
          나 <span className="rounded bg-emerald-500 px-1.5 text-xs text-white">{cards.length}장</span>
        </div>
        {score !== undefined && (
          <div className="text-sm font-bold text-amber-300">
            {score}점{goCount ? <span className="ml-1 rounded bg-rose-600 px-1 text-xs text-white">{goCount}고</span> : null}
          </div>
        )}
        {onHint && myTurn && (
          <button
            type="button"
            onClick={onHint}
            className="mt-0.5 w-fit rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white shadow active:translate-y-px"
          >
            💡 훈수 듣기
          </button>
        )}
      </div>

      {/* 손패 */}
      <div className="flex flex-1 items-end justify-center gap-2 pt-2">
        {cards.length === 0 ? (
          score === undefined && (
            <span className="text-sm font-semibold text-amber-100/70">패를 돌리면 여기에 내 패가 표시됩니다</span>
          )
        ) : (
          cards.map((c) => (
            <Card
              key={c.id}
              card={c}
              size={HAND_CARD}
              selected={c.id === selectedId}
              className={`${myTurn ? '' : 'brightness-90'} ${c.id === recommendedId && c.id !== selectedId ? 'ring-4 ring-emerald-400' : ''}`}
              onClick={() => (myTurn && c.id === selectedId ? onPlay(c) : onSelect(c))}
            />
          ))
        )}
      </div>

      {/* 내기 */}
      <div className="flex w-[170px] shrink-0 justify-end">
        {myTurn && selected ? (
          <button
            type="button"
            onClick={() => onPlay(selected)}
            className="animate-pulse rounded-2xl bg-amber-500 px-4 py-3 text-base font-black text-white shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none"
          >
            {selected.isBonus ? '보너스' : `${selected.month}월`} 내기 ▶
          </button>
        ) : myTurn ? (
          <span className="rounded-2xl bg-amber-500/90 px-3 py-2 text-center text-sm font-bold text-white">
            내 차례!
            <br />
            낼 패를 고르세요
          </span>
        ) : (
          <span className="text-sm text-amber-100/60">상대 차례…</span>
        )}
      </div>
    </div>
  );
}

/** 내가 광을 팔고 구경하는 판 — 받았던 패를 보여주고 광을 강조 */
function SoldPanel({ hand }: { hand: HwatuCard[] }) {
  const gwang = hand.filter((c) => c.type === 'gwang').length;
  return (
    <div
      className="absolute inset-x-0 bottom-0 z-40 flex items-center gap-4 border-t-4 border-violet-400 bg-gradient-to-b from-[#4b3a5e] to-[#2a2035] px-5"
      style={{ height: HAND_PANEL_H }}
    >
      <div className="w-[190px] shrink-0 text-amber-50">
        <div className="text-lg font-black">이번 판은 구경!</div>
        <div className="text-sm text-amber-300">{gwang > 0 ? `광 ${gwang}장 팔았어요` : '광이 없어서 그냥 구경해요'}</div>
      </div>
      <div className="flex flex-1 items-end justify-center gap-2">
        {hand.map((c) => (
          <Card
            key={c.id}
            card={c}
            size={{ w: 56, h: 84 }}
            className={c.type === 'gwang' ? 'ring-4 ring-amber-300' : 'opacity-60'}
          />
        ))}
      </div>
      <div className="w-[170px] shrink-0 text-right text-sm text-amber-100/70">세 분이 치는 걸 지켜봐요 👀</div>
    </div>
  );
}
