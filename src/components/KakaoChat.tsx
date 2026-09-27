import { useState } from 'react';
import type { PlayerSeat } from '../game/types';

export interface ChatMessage {
  seq: number;
  text: string;
  /** 표시용 시각 (예: 오후 3:24) */
  time: string;
}

const EXTS = ['webp', 'png', 'jpg'] as const;
const AVATAR_BG: Record<string, string> = { grandma: '#e79bb0', uncle: '#6d8fd6', 'father-in-law': '#8a9a5b' };

/** 프로필 사진 — public/assets/profiles/{seatId}.(webp|png|jpg), 없으면 이름 첫 글자 아바타 */
function Profile({ seat }: { seat: PlayerSeat }) {
  const [ext, setExt] = useState(0);
  const failed = ext >= EXTS.length;
  return (
    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-[14px] shadow">
      {failed ? (
        <div
          className="flex h-full w-full items-center justify-center text-lg font-black text-white"
          style={{ background: AVATAR_BG[seat.id] ?? '#999' }}
        >
          {seat.name[0]}
        </div>
      ) : (
        <img
          src={`${import.meta.env.BASE_URL}assets/profiles/${seat.id}.${EXTS[ext]}`}
          alt={seat.name}
          className="h-full w-full object-cover"
          onError={() => setExt((e) => e + 1)}
        />
      )}
    </div>
  );
}

interface Props {
  seat: PlayerSeat;
  messages: ChatMessage[];
  x: number;
  y: number;
  w: number;
  /** 접힘 상태 — 머리줄만 보이고 새 메시지 수를 표시 */
  collapsed: boolean;
  unread: number;
  onToggle: () => void;
}

/**
 * 광 팔고 나간 사람의 빈자리에 뜨는 카카오톡 스타일 훈수 채팅.
 * 최근 메시지 몇 개만 보여주고, 새 메시지는 아래에서 톡 올라온다.
 */
export function KakaoChat({ seat, messages, x, y, w, collapsed, unread, onToggle }: Props) {
  const recent = messages.slice(-3);
  return (
    <div
      className={`pointer-events-none absolute z-40 overflow-hidden border border-white/40 bg-[#b2c7da]/92 shadow-xl ${collapsed ? 'rounded-full' : 'rounded-2xl'}`}
      style={{ left: x, top: y, width: w }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="pointer-events-auto flex w-full items-center justify-between gap-2 bg-[#a3b8cc] px-3 py-1 text-[11px] font-bold text-[#3c4b5a]"
      >
        <span className="flex items-center gap-1">
          💬 {seat.name}의 훈수방
          {collapsed && unread > 0 && (
            <span className="rounded-full bg-rose-500 px-1.5 text-[10px] text-white">{unread}</span>
          )}
        </span>
        <span className="flex items-center gap-1.5">
          {!collapsed && <span className="rounded-full bg-[#fee500] px-1.5 text-[10px] text-[#3c1e1e]">광 팔고 구경 중</span>}
          <span className="rounded bg-white/50 px-1.5">{collapsed ? '펼치기 ▼' : '접기 ▲'}</span>
        </span>
      </button>
      {!collapsed && (
      <div className="flex flex-col gap-1.5 px-2.5 py-2">
        {recent.length === 0 && (
          <div className="mx-auto rounded-full bg-black/10 px-3 py-0.5 text-[11px] text-[#3c4b5a]">
            {seat.name}님이 훈수방에 들어왔습니다
          </div>
        )}
        {recent.map((m, i) => {
          const showProfile = i === 0; // 카톡처럼 연속 메시지는 프로필 한 번만
          return (
            <div key={m.seq} className="flex animate-[pop_.25s_ease-out] items-start gap-1.5">
              {showProfile ? <Profile seat={seat} /> : <div className="w-10 shrink-0" />}
              <div className="min-w-0 flex-1">
                {showProfile && <div className="mb-0.5 text-[11px] text-[#3c4b5a]">{seat.name}</div>}
                <div className="flex items-end gap-1">
                  <div className="relative max-w-[200px] break-keep rounded-[12px] rounded-tl-[4px] bg-white px-2.5 py-1.5 text-[13px] leading-snug text-[#222]">
                    {m.text}
                  </div>
                  <span className="shrink-0 text-[9px] text-[#56687a]">{m.time}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
