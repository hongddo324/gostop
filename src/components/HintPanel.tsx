import type { HintExplanation } from '../logic/hintEngine';
import type { HwatuCard } from '../game/types';
import { Card } from './Card';

interface Props {
  hint: HintExplanation;
  card?: HwatuCard;
  /** 훈수 두는 사람 이름 */
  adviser: string;
  onClose: () => void;
}

/** 도움 모드 상세 훈수 — 추천 패, 핵심 이유, 설명, 가중치 내역 */
export function HintPanel({ hint, card, adviser, onClose }: Props) {
  const b = hint.scoreBreakdown;
  const bars: [string, number, string][] = [
    ['득점', b.gainScore, 'bg-emerald-500'],
    ['견제', b.defenseScore, 'bg-sky-500'],
    ['위험', -b.riskPenalty, 'bg-rose-500'],
  ];
  const max = Math.max(1, ...bars.map(([, v]) => Math.abs(v)));

  return (
    <div className="absolute bottom-[122px] left-4 z-50 flex w-[470px] gap-3 rounded-2xl border-2 border-emerald-400/70 bg-[#1f2a22]/95 p-3 text-amber-50 shadow-2xl">
      {card && (
        <div className="flex flex-col items-center gap-1">
          <Card card={card} size={{ w: 64, h: 96 }} className="ring-4 ring-emerald-400" />
          <span className="text-[11px] font-bold text-emerald-300">{hint.actionType === 'MATCH' ? '먹기' : '버리기'}</span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-emerald-300">{adviser}의 훈수</span>
          <button type="button" onClick={onClose} className="text-xs opacity-70">
            닫기 ✕
          </button>
        </div>
        <div className="text-base font-black">{hint.primaryReason}</div>
        <p className="mt-0.5 text-[12px] leading-snug opacity-90">{hint.detailedExplanation}</p>
        <div className="mt-2 space-y-0.5">
          {bars.map(([label, v, color]) => (
            <div key={label} className="flex items-center gap-2 text-[11px]">
              <span className="w-7 opacity-80">{label}</span>
              <span className="h-2 flex-1 rounded bg-white/10">
                <span className={`block h-2 rounded ${color}`} style={{ width: `${(Math.abs(v) / max) * 100}%` }} />
              </span>
              <span className="w-10 text-right tabular-nums">{v > 0 ? `+${v}` : v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
