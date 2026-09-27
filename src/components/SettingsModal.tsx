import { useState } from 'react';
import { DIFFICULTY_LABEL, type Difficulty } from '../logic/aiEngine';
import { SPEEDS, type Settings } from '../settings';

interface Props {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onClose: () => void;
  /** 모두의 돈을 처음(3만원)으로 */
  onResetMoney: () => void;
}

const DIFF_DESC: Record<Difficulty, string> = {
  beginner: '짝 맞는 패 아무거나, 고/스톱은 반반',
  intermediate: '자기 점수만 챙김, 1고 후 스톱',
  expert: '견제·족보·뻑 확률까지 계산하는 타짜',
};

/** 우상단 ⚙ 설정: 난이도 / 배속 / 도움 모드 */
export function SettingsModal({ settings, onChange, onClose, onResetMoney }: Props) {
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-[560px] rounded-2xl border-2 border-[#8a5a33] bg-[#3e2615]/95 px-7 pb-6 pt-5 text-amber-50 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="text-2xl font-black">⚙ 설정</span>
          <button type="button" onClick={onClose} className="rounded-lg bg-black/30 px-3 py-1 text-sm font-bold">
            닫기
          </button>
        </div>

        <Section title="상대 난이도">
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(DIFFICULTY_LABEL) as Difficulty[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onChange({ difficulty: d })}
                className={`rounded-xl border-2 px-2 py-2 text-left ${
                  settings.difficulty === d ? 'border-amber-400 bg-amber-500/25' : 'border-white/15 bg-black/20'
                }`}
              >
                <div className="text-sm font-black">{DIFFICULTY_LABEL[d]}</div>
                <div className="mt-0.5 text-[11px] leading-tight opacity-75">{DIFF_DESC[d]}</div>
              </button>
            ))}
          </div>
        </Section>

        <Section title="게임 속도">
          <div className="flex gap-2">
            {SPEEDS.map((sp) => (
              <button
                key={sp}
                type="button"
                onClick={() => onChange({ speed: sp })}
                className={`flex-1 rounded-xl border-2 py-2 text-lg font-black ${
                  settings.speed === sp ? 'border-amber-400 bg-amber-500/25' : 'border-white/15 bg-black/20'
                }`}
              >
                {sp}배속
              </button>
            ))}
          </div>
        </Section>

        <Section title="도움 모드">
          <Toggle
            label="훈수 듣기 버튼 + 상세 설명"
            desc="내 차례에 버튼을 누르면 추천 패와 이유를 자세히 알려줘요"
            value={settings.helpMode}
            onChange={(v) => onChange({ helpMode: v })}
          />
          <Toggle
            label="자동 훈수"
            desc="내 차례마다 광 판 사람이 한마디씩 훈수를 둬요"
            value={settings.autoHint}
            onChange={(v) => onChange({ autoHint: v })}
          />
        </Section>

        <Section title="돈 (1점 = 1,000원)">
          {confirmReset ? (
            <div className="flex items-center gap-2 rounded-xl bg-rose-900/40 px-3 py-2 text-sm">
              <span className="flex-1">모두의 돈을 3만원으로 되돌릴까요?</span>
              <button
                type="button"
                onClick={() => {
                  onResetMoney();
                  setConfirmReset(false);
                }}
                className="rounded-lg bg-rose-600 px-3 py-1 font-bold"
              >
                초기화
              </button>
              <button type="button" onClick={() => setConfirmReset(false)} className="rounded-lg bg-black/30 px-3 py-1">
                취소
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="w-full rounded-xl border-2 border-rose-400/60 bg-black/20 py-2 text-sm font-bold text-rose-200"
            >
              💸 돈 초기화 (모두 3만원으로)
            </button>
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 text-sm font-bold text-amber-300">{title}</div>
      {children}
    </div>
  );
}

function Toggle({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)} className="mb-1.5 flex w-full items-center gap-3 rounded-xl bg-black/20 px-3 py-2 text-left">
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${value ? 'bg-emerald-500' : 'bg-stone-500'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${value ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
      <span>
        <span className="block text-sm font-bold">{label}</span>
        <span className="block text-[11px] opacity-70">{desc}</span>
      </span>
    </button>
  );
}
