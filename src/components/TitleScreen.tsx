import { useState } from 'react';
import { formatWon } from '../game/money';
import { exitApp } from '../lib/exitApp';
import { Background } from './Background';

interface Props {
  myMoney: number;
  onStart: () => void;
  onSettings: () => void;
}

/** 첫 화면: 거실 배경 + 게임 시작 / 설정 / 게임 종료 (캐릭터 없음) */
export function TitleScreen({ myMoney, onStart, onSettings }: Props) {
  const [exitMsg, setExitMsg] = useState(false);

  return (
    <div className="absolute inset-0">
      <Background />

      {/* 살짝 어둡게 + 가운데 메뉴 */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/25 to-black/55" />
      <div className="absolute left-1/2 top-[372px] flex w-[440px] -translate-x-1/2 flex-col items-center rounded-3xl bg-black/35 px-8 pb-6 pt-4 backdrop-blur-[2px]">
        <div className="mb-1 rounded-full bg-black/40 px-4 py-0.5 text-sm font-bold text-amber-200">🎴 우리 가족 거실 고스톱</div>
        <h1 className="mb-1 whitespace-nowrap text-[54px] font-black leading-none tracking-tight text-white drop-shadow-[0_4px_0_rgba(120,53,15,0.9)]">
          월곡이 고스톱
        </h1>
        <div className="mb-4 text-sm font-bold text-amber-100 drop-shadow">내 돈 {formatWon(myMoney)}</div>

        <button
          type="button"
          onClick={onStart}
          className="mb-3 w-full rounded-2xl bg-amber-500 py-4 text-2xl font-black text-white shadow-[0_6px_0_#b45309] active:translate-y-1 active:shadow-[0_2px_0_#b45309]"
        >
          ▶ 게임 시작
        </button>
        <div className="flex w-full gap-3">
          <button
            type="button"
            onClick={onSettings}
            className="flex-1 rounded-2xl bg-[#4a2e1a]/90 py-3 text-lg font-black text-amber-50 shadow-[0_4px_0_#2a1a0e] active:translate-y-1 active:shadow-none"
          >
            ⚙ 설정
          </button>
          <button
            type="button"
            onClick={() => {
              if (!exitApp()) setExitMsg(true);
            }}
            className="flex-1 rounded-2xl bg-[#4a2e1a]/90 py-3 text-lg font-black text-amber-50 shadow-[0_4px_0_#2a1a0e] active:translate-y-1 active:shadow-none"
          >
            ⏻ 게임 종료
          </button>
        </div>
        {exitMsg && (
          <div className="mt-3 rounded-xl bg-black/60 px-4 py-2 text-center text-sm text-white">
            웹에서는 브라우저 탭을 직접 닫아 주세요.
            <br />
            (앱에서는 바로 종료됩니다)
          </div>
        )}
      </div>
    </div>
  );
}
