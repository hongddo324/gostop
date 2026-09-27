import { BILL_VALUES, formatWon, toBills, type BillValue } from '../game/money';

const BILL = { w: 46, h: 19 };
const billUrl = (v: BillValue) => `${import.meta.env.BASE_URL}assets/money/${v}.webp`;

interface Props {
  amount: number;
  /** 방금 판에서 오간 금액 (+/-) — 잠깐 표시 */
  delta?: number;
  /** 지폐를 오른쪽 정렬 (화면 오른쪽 좌석) */
  alignRight?: boolean;
  /** 한 줄로 (손패 패널용) */
  horizontal?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/** 가진 돈을 지폐 묶음으로 — 종류별로 겹쳐 쌓고 장수 표시 */
export function MoneyStack({ amount, delta, alignRight, horizontal, className = '', style }: Props) {
  const bills = toBills(amount);
  const kinds = BILL_VALUES.filter((v) => bills[v] > 0);

  return (
    <div
      className={`pointer-events-none flex gap-0.5 rounded-lg bg-black/35 px-1.5 py-1 ${
        horizontal ? 'flex-row flex-wrap items-center gap-x-2' : 'flex-col'
      } ${alignRight ? 'items-end' : 'items-start'} ${className}`}
      style={style}
    >
      {kinds.length === 0 && <span className="text-[11px] font-bold text-rose-200">빈털터리 😢</span>}
      {kinds.map((v) => {
        const n = bills[v];
        const shown = Math.min(n, 4);
        return (
          <div key={v} className={`flex items-center gap-1 ${alignRight ? 'flex-row-reverse' : ''}`}>
            <div className="relative" style={{ width: BILL.w + (shown - 1) * 5, height: BILL.h + (shown - 1) * 2 }}>
              {Array.from({ length: shown }, (_, i) => (
                <img
                  key={i}
                  src={billUrl(v)}
                  alt=""
                  draggable={false}
                  className="absolute rounded-[2px] shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
                  style={{ width: BILL.w, height: BILL.h, left: i * 5, top: (shown - 1 - i) * 2 }}
                />
              ))}
            </div>
            <span className="text-[11px] font-black text-white drop-shadow">×{n}</span>
          </div>
        );
      })}
      <div className="flex items-center gap-1 text-[12px] font-black text-amber-200 drop-shadow">
        {formatWon(amount)}
        {!!delta && (
          <span key={delta} className={`animate-[pop_.3s_ease-out] ${delta > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
            {delta > 0 ? '+' : ''}
            {delta.toLocaleString('ko-KR')}
          </span>
        )}
      </div>
    </div>
  );
}
