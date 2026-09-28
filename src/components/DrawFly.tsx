import { useEffect, useState } from 'react';
import { Card } from './Card';

interface Props {
  /** 출발점(더미)·도착점(받는 사람 손) — 스테이지 좌표, 카드 중심 */
  from: { x: number; y: number };
  to: { x: number; y: number };
  /** 이동 시간(ms) */
  ms: number;
}

const SIZE = { w: 44, h: 66 };

/**
 * 보너스패를 냈을 때 더미에서 1장을 받아 가는 연출 — 뒷면 카드가 더미에서 받는 사람 손으로 날아가고 '+1장' 표시.
 * 부모가 key 로 매번 새로 마운트하고, 끝나면 언마운트한다.
 */
export function DrawFly({ from, to, ms }: Props) {
  const [arrived, setArrived] = useState(false);
  useEffect(() => {
    // 첫 페인트(더미 위치) 다음 프레임에 목적지로 이동
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setArrived(true)));
    return () => cancelAnimationFrame(id);
  }, []);
  const p = arrived ? to : from;

  return (
    <div
      className="pointer-events-none absolute z-50"
      style={{
        left: p.x - SIZE.w / 2,
        top: p.y - SIZE.h / 2,
        transition: `left ${ms}ms cubic-bezier(.3,.7,.4,1), top ${ms}ms cubic-bezier(.3,.7,.4,1), opacity ${ms}ms ease-in`,
        opacity: arrived ? 0.85 : 1,
      }}
    >
      <Card faceDown size={SIZE} className="rotate-6" />
      <span className="absolute -right-10 -top-5 animate-[pop_.25s_ease-out] whitespace-nowrap rounded-full bg-emerald-500 px-2 py-0.5 text-sm font-black text-white shadow">
        +1장
      </span>
    </div>
  );
}
