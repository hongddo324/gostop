import type { ReactNode } from 'react';
import type { ScoreBreakdown } from '../game/scoring';
import type { GameResult, GwangSale, HwatuCard, PendingChoice, PlayerState } from '../game/types';
import { Card } from './Card';

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/45">
      <div className="min-w-[380px] rounded-2xl border-2 border-[#8a5a33] bg-[#3e2615]/95 px-6 pb-5 pt-4 text-amber-50 shadow-2xl">
        <div className="mb-3 text-center text-xl font-black">{title}</div>
        {children}
      </div>
    </div>
  );
}

const BIG = { w: 100, h: 150 };

/** 같은 월 2장 중 먹을 패 선택 */
export function ChoiceModal({ pending, onChoose }: { pending: PendingChoice; onChoose: (card: HwatuCard) => void }) {
  return (
    <Panel title={pending.kind === 'play' ? '어느 패를 먹을까요?' : '뒤집은 패로 어느 패를 먹을까요?'}>
      <div className="flex items-end justify-center gap-6">
        <div className="flex flex-col items-center gap-1 opacity-80">
          <Card card={pending.card} size={{ w: 72, h: 108 }} />
          <span className="text-xs">{pending.kind === 'play' ? '낸 패' : '뒤집은 패'}</span>
        </div>
        <span className="mb-12 text-2xl">→</span>
        {pending.options.map((c) => (
          <button key={c.id} type="button" onClick={() => onChoose(c)} className="flex flex-col items-center gap-1">
            <Card card={c} size={BIG} className="hover:-translate-y-1 hover:ring-4 hover:ring-amber-300" />
            <span className="text-xs font-bold">{c.name}</span>
          </button>
        ))}
      </div>
    </Panel>
  );
}

function Breakdown({ s }: { s: ScoreBreakdown }) {
  const rows: [string, number][] = [
    ['광', s.gwang],
    ['열끗', s.yeol],
    ['띠', s.tti],
    ['피', s.pi],
  ];
  return (
    <div className="flex items-center justify-center gap-3 text-sm">
      {rows.map(([k, v]) => (
        <span key={k} className={v ? 'font-bold text-amber-300' : 'opacity-50'}>
          {k} {v}
        </span>
      ))}
      {s.combos.length > 0 && <span className="text-rose-300">({s.combos.join(', ')})</span>}
    </div>
  );
}

/** 고 / 스톱 */
export function GoStopModal({
  player,
  score,
  onDecide,
}: {
  player: PlayerState;
  score: ScoreBreakdown;
  onDecide: (go: boolean) => void;
}) {
  return (
    <Panel title={`${score.total}점! 고? 스톱?`}>
      <Breakdown s={score} />
      <div className="mt-1 text-center text-xs opacity-70">
        현재 {player.goCount}고 · 남은 손패 {player.hand.length}장 — 고를 하면 점수가 더 올라야 다시 부를 수 있어요
      </div>
      <div className="mt-4 flex justify-center gap-4">
        <button
          type="button"
          onClick={() => onDecide(true)}
          className="rounded-xl bg-rose-600 px-8 py-3 text-2xl font-black shadow-[0_4px_0_#9f1239] active:translate-y-1 active:shadow-none"
        >
          고!
        </button>
        <button
          type="button"
          onClick={() => onDecide(false)}
          className="rounded-xl bg-sky-600 px-8 py-3 text-2xl font-black shadow-[0_4px_0_#075985] active:translate-y-1 active:shadow-none"
        >
          스톱!
        </button>
      </div>
    </Panel>
  );
}

/** 판 결과 */
export function ResultModal({
  result,
  gwangSale,
  nameOf,
  winnerScore,
  onNext,
}: {
  result: GameResult;
  gwangSale: GwangSale;
  nameOf: (seatId: string) => string;
  winnerScore?: ScoreBreakdown;
  onNext: () => void;
}) {
  return (
    <Panel title={result.winnerId ? `🎉 ${nameOf(result.winnerId)} 승리!` : '나가리 — 아무도 못 났어요'}>
      {result.winnerId && winnerScore && (
        <>
          <Breakdown s={winnerScore} />
          <div className="mt-2 text-center text-sm">
            기본 {result.baseScore}점{result.goCount > 0 && ` · ${result.goCount}고`} →{' '}
            <b className="text-lg text-amber-300">{result.score}점</b>
          </div>
          <div className="mt-3 space-y-1">
            {result.losers.map((l) => (
              <div key={l.seatId} className="flex justify-between gap-6 rounded bg-black/25 px-3 py-1 text-sm">
                <span>{nameOf(l.seatId)}</span>
                <span>
                  {l.gwangBak && <span className="mr-1 rounded bg-amber-600 px-1 text-xs">광박</span>}
                  {l.piBak && <span className="mr-1 rounded bg-stone-500 px-1 text-xs">피박</span>}
                  <b>-{l.points}점</b>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
      {gwangSale.gwangCount > 0 && (
        <div className="mt-3 rounded bg-amber-900/40 px-3 py-1 text-center text-sm">
          광값 · {nameOf(gwangSale.sellerId)} 광 {gwangSale.gwangCount}장 → 한 사람당 <b>{gwangSale.pricePerPlayer}점</b>씩 받음
        </div>
      )}
      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={onNext}
          className="rounded-xl bg-amber-500 px-8 py-2 text-lg font-black text-white shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none"
        >
          한 판 더!
        </button>
      </div>
    </Panel>
  );
}
