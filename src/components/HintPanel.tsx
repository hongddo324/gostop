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

/**
 * '훈수 듣기' 상세 패널 — 채팅방은 무엇을 하라는지만 짧게, 여기서는 왜 그 판단이 유리한지 자세히.
 *  ① 추천 패와 핵심 이유  ② 왜 유리한가(근거 목록)  ③ 다른 선택지와 비교  ④ 평가 점수 내역
 */
export function HintPanel({ hint, card, adviser, onClose }: Props) {
  const b = hint.scoreBreakdown;
  const bars: [string, number, string][] = [
    ['득점', b.gainScore, 'bg-emerald-500'],
    ['견제', b.defenseScore, 'bg-sky-500'],
    ['위험', -b.riskPenalty, 'bg-rose-500'],
  ];
  const max = Math.max(1, ...bars.map(([, v]) => Math.abs(v)));

  return (
    <div className="absolute bottom-[122px] left-4 z-50 w-[560px] rounded-2xl border-2 border-emerald-400/70 bg-[#1f2a22]/95 p-3 text-amber-50 shadow-2xl">
      <div className="flex gap-3">
        {card && (
          <div className="flex flex-col items-center gap-1">
            <Card card={card} size={{ w: 60, h: 90 }} className="ring-4 ring-emerald-400" />
            <span className="text-[11px] font-bold text-emerald-300">{hint.actionType === 'MATCH' ? '먹기' : '버리기'}</span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-300">{adviser}의 훈수 · 자세히</span>
            <button type="button" onClick={onClose} className="text-xs opacity-70">
              닫기 ✕
            </button>
          </div>
          <div className="text-base font-black">{hint.primaryReason}</div>
          <p className="mt-0.5 text-[12px] leading-snug opacity-90">{hint.detailedExplanation}</p>
        </div>
      </div>

      <div className="mt-2 rounded-lg bg-black/25 px-3 py-2">
        <div className="mb-1 text-[12px] font-bold text-amber-300">왜 유리한가</div>
        <ul className="space-y-0.5 text-[12px] leading-snug">
          {hint.reasons.map((r, i) => (
            <li key={i} className="flex gap-1.5">
              <span className="text-emerald-400">✔</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </div>

      {hint.alternatives.length > 0 && (
        <div className="mt-2 rounded-lg bg-black/25 px-3 py-2">
          <div className="mb-1 text-[12px] font-bold text-amber-300">다른 선택과 비교</div>
          {hint.alternatives.map((a) => (
            <div key={a.cardName} className="flex items-center gap-2 text-[12px]">
              <span className="w-[120px] truncate font-bold">{a.cardName}</span>
              <span className="rounded bg-white/10 px-1 text-[10px]">{a.actionType === 'MATCH' ? '먹기' : '버리기'}</span>
              <span className="flex-1 truncate opacity-85">— {a.why}</span>
              <span className="tabular-nums text-rose-300">-{a.gap}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 grid grid-cols-3 gap-2">
        {bars.map(([label, v, color]) => (
          <div key={label} className="text-[11px]">
            <div className="flex justify-between opacity-80">
              <span>{label}</span>
              <span className="tabular-nums">{v > 0 ? `+${v}` : v}</span>
            </div>
            <span className="block h-1.5 rounded bg-white/10">
              <span className={`block h-1.5 rounded ${color}`} style={{ width: `${(Math.abs(v) / max) * 100}%` }} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
