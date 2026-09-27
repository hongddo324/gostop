import { useLayoutEffect, useRef, useState } from 'react';
import {
  CAPTURE_LAYOUT,
  DECK_POS,
  FIELD_SLOTS,
  MAT_CARD,
  MAT_H,
  MAT_QUAD,
  MAT_W,
  PILE_CARD,
  PILE_ROTATION,
  PILE_SCALE,
  PILE_STEP,
  PI_STACK,
  ZONE_BLOCK,
  type PileRect,
} from '../config/layout';
import { rectToQuadMatrix3d, unprojectPoint } from '../lib/homography';
import type { CardType, HwatuCard, Month, SeatPosition } from '../game/types';
import { Card } from './Card';

export interface SeatCaptures {
  position: SeatPosition;
  name: string;
  cards: HwatuCard[];
}

/** 카드 확대 보기 요청 (탭한 카드 묶음) */
export type InspectHandler = (title: string, cards: HwatuCard[]) => void;

interface Props {
  field: HwatuCard[];
  deck: HwatuCard[];
  captures: SeatCaptures[];
  /** 내가 선택한 카드의 월 — 같은 월 바닥 패를 강조 */
  highlightMonth?: Month;
  /** 손에서 새로 모포로 나오는 카드의 출발점 (배경 좌표) */
  enterFrom?: { x: number; y: number };
  /** 카드 이동 애니메이션 시간 (배속 반영) */
  moveMs: number;
  onInspect: InspectHandler;
}

/** 모포 평면 → 배경 사다리꼴 투영 (한 번만 계산) */
const MAT_TRANSFORM = rectToQuadMatrix3d(MAT_W, MAT_H, MAT_QUAD);
const toPlane = (p: { x: number; y: number }) => unprojectPoint(MAT_W, MAT_H, MAT_QUAD, p.x, p.y);

const TYPES: CardType[] = ['gwang', 'yeol', 'tti', 'pi'];
const TYPE_NAME: Record<CardType, string> = { gwang: '광', yeol: '열끗', tti: '띠', pi: '피' };
const DECK_VISIBLE = 6;

/** 평면 위 카드 1장의 배치 */
interface Placed {
  card: HwatuCard;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  faceDown?: boolean;
  highlighted?: boolean;
  /** 위치 구분(deck/field/pile) — 바뀌면 이동 중으로 보고 맨 위로 */
  zone: string;
  /** 카드 회전(deg) — 외할머니·장인어른 쪽 득점 패는 180° */
  rotate?: number;
  onClick?: () => void;
}

/**
 * 월 → 바닥 칸 번호를 판이 진행되는 동안 고정한다.
 * (그룹 인덱스로 칸을 정하면 앞 그룹이 먹힐 때 나머지가 한 칸씩 밀려 보이므로)
 */
function useStableSlots(months: Month[]): Map<Month, number> {
  const ref = useRef(new Map<Month, number>());
  const map = ref.current;
  for (const m of [...map.keys()]) if (!months.includes(m)) map.delete(m);
  for (const m of months) {
    if (map.has(m)) continue;
    const used = new Set(map.values());
    const free = FIELD_SLOTS.findIndex((_, i) => !used.has(i));
    if (free >= 0) map.set(m, free);
  }
  return map;
}

/**
 * 모포 위에 놓이는 모든 카드(더미, 바닥 패, 득점 패).
 * 내부는 평평한 MAT_W × MAT_H 좌표로 배치하고, 컨테이너에 matrix3d 를 걸어
 * 배경 모포의 기울기/원근에 그대로 눕힌다.
 * 모든 카드를 카드 ID 로 키잉한 평면 목록으로 그리므로, 카드가 더미→바닥→득점 패로
 * 옮겨가면 CSS transition 으로 모포 위를 미끄러지듯 이동한다.
 */
export function Board({ field, deck, captures, highlightMonth, enterFrom, moveMs, onInspect }: Props) {
  const placed: Placed[] = [];

  // 더미 (맨 위 몇 장만 — 두께감)
  deck.slice(0, DECK_VISIBLE).forEach((card, i) => {
    const depth = Math.min(deck.length, DECK_VISIBLE) - 1 - i;
    placed.push({
      card,
      x: DECK_POS.x - depth * 1.2,
      y: DECK_POS.y - depth * 1.8,
      w: MAT_CARD.w,
      h: MAT_CARD.h,
      z: 10 + depth,
      faceDown: true,
      zone: 'deck',
    });
  });

  // 바닥 패 — 같은 월끼리 한 칸에 겹침
  const groups = new Map<Month, HwatuCard[]>();
  for (const c of field) groups.set(c.month, [...(groups.get(c.month) ?? []), c]);
  const slots = useStableSlots([...groups.keys()]);
  for (const [month, group] of groups) {
    const pos = FIELD_SLOTS[slots.get(month) ?? 0]!;
    group.forEach((card, i) =>
      placed.push({
        card,
        x: pos.x - MAT_CARD.w / 2 + i * 6,
        y: pos.y - MAT_CARD.h / 2 + i * 7,
        w: MAT_CARD.w,
        h: MAT_CARD.h,
        z: 30 + i,
        highlighted: month === highlightMonth,
        zone: 'field',
        onClick: () => onInspect(`바닥 패 · ${month}월`, group),
      }),
    );
  }

  // 득점 패 — 좌석 블록 안에 종류별 그룹. 겹치더라도 카드 짧은 변의 55% 이상은 보이게 간격을 둔다
  const badges: { key: string; x: number; y: number; text: string }[] = [];
  for (const { position, name, cards } of captures) {
    const rotate = PILE_ROTATION[position];
    const sideways = Math.abs(rotate) === 90;
    const k = PILE_SCALE[position];
    const cw = PILE_CARD.w * k;
    const ch = PILE_CARD.h * k;
    // 화면에 보이는 카드 모양 (90° 회전이면 가로로 누움)
    const vw = sideways ? ch : cw;
    const vh = sideways ? cw : ch;
    for (const type of TYPES) {
      const pile = cards.filter((c) => c.type === type);
      if (pile.length === 0) continue;
      const rect: PileRect = CAPTURE_LAYOUT[position][type];
      const inspect = () => onInspect(`${name} · ${TYPE_NAME[type]} ${pile.length}장`, pile);
      const along = rect.axis === 'x' ? vw : vh;
      const length = rect.axis === 'x' ? rect.w : rect.h;
      const offs = stackOffsets(pile.length, length, along, type === 'pi', k);
      const visual = offs.map((o) => (rect.axis === 'x' ? { x: o.a, y: o.b } : { x: o.b, y: o.a }));
      pile.forEach((card, i) => {
        const vx = rect.x + visual[i]!.x;
        const vy = rect.y + visual[i]!.y;
        placed.push({
          card,
          // 회전은 카드 중심 기준 → 보이는 상자 중심에 원래 크기 상자를 맞춘다
          x: vx + (vw - cw) / 2,
          y: vy + (vh - ch) / 2,
          w: cw,
          h: ch,
          z: 60 + i,
          zone: `pile-${position}`,
          rotate,
          onClick: inspect,
        });
      });
      const last = visual[visual.length - 1]!;
      const count = type === 'pi' ? pile.reduce((n, c) => n + c.piValue, 0) : pile.length;
      badges.push({
        key: `${position}-${type}`,
        x: rect.x + last.x + vw - 10,
        y: rect.y + last.y - 7,
        text: `${TYPE_NAME[type]} ${count}`,
      });
    }
  }

  // 이동 감지: 직전 렌더와 zone 이 달라진 카드는 이동 중 → 맨 위로
  const lastZone = useRef(new Map<string, string>());
  const moving = new Set(placed.filter((p) => lastZone.current.get(p.card.id) !== p.zone).map((p) => p.card.id));
  useLayoutEffect(() => {
    lastZone.current = new Map(placed.map((p) => [p.card.id, p.zone]));
  });

  const enter = enterFrom ? toPlane(enterFrom) : undefined;

  return (
    <div
      className="pointer-events-none absolute left-0 top-0"
      style={{ width: MAT_W, height: MAT_H, transformOrigin: '0 0', transform: MAT_TRANSFORM }}
    >
      {/* 좌석별 득점 영역 가이드선 */}
      {captures.map(({ position, name }) => {
        const b = ZONE_BLOCK[position];
        return (
          <div
            key={`guide-${position}`}
            className="absolute rounded-[10px] border-2 border-dashed border-amber-100/45 bg-black/[0.06]"
            style={{ left: b.x, top: b.y, width: b.w, height: b.h }}
          >
            <span className="absolute -top-[2px] left-2 -translate-y-full rounded-t-md bg-black/45 px-2 text-[13px] font-bold leading-[18px] text-amber-100">
              {name}
            </span>
          </div>
        );
      })}
      {placed.map((p) => (
        <PlaneCard
          key={p.card.id}
          {...p}
          z={moving.has(p.card.id) ? 500 + p.z : p.z}
          moveMs={moveMs}
          // 손에서 새로 나온 카드만 날아온다 (더미 아래쪽에서 새로 드러나는 카드는 제외)
          from={enter && p.zone !== 'deck' && !lastZone.current.has(p.card.id) ? enter : undefined}
        />
      ))}
      {badges.map((b) => (
        <span
          key={b.key}
          className="absolute z-[900] whitespace-nowrap rounded-full bg-black/70 px-1.5 text-center text-[12px] font-black leading-[17px] text-amber-200"
          style={{ left: b.x, top: b.y }}
        >
          {b.text}
        </span>
      ))}
    </div>
  );
}

/** 평면 위 카드: 위치/크기가 바뀌면 transition, 새로 등장하면 from 에서 날아온다 */
function PlaneCard({
  card,
  x,
  y,
  w,
  h,
  z,
  faceDown,
  highlighted,
  rotate,
  onClick,
  from,
  moveMs,
}: Placed & { from?: { x: number; y: number }; moveMs: number }) {
  const [pos, setPos] = useState(() => (from ? { x: from.x - w / 2, y: from.y - h / 2 } : { x, y }));

  useLayoutEffect(() => {
    if (pos.x === x && pos.y === y) return;
    // 등장 직후 한 프레임 뒤에 목표로 이동시켜 transition 이 걸리게 한다
    const id = requestAnimationFrame(() => setPos({ x, y }));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x, y]);

  return (
    <div
      className={`absolute ${onClick ? 'pointer-events-auto cursor-zoom-in' : ''}`}
      style={{
        left: pos.x,
        top: pos.y,
        zIndex: z,
        transition: `left ${moveMs}ms ease-out, top ${moveMs}ms ease-out, transform ${moveMs}ms ease-out`,
        transform: rotate ? `rotate(${rotate}deg)` : undefined,
      }}
      onClick={onClick}
    >
      <Card card={card} size={{ w, h }} faceDown={faceDown} highlighted={highlighted} />
    </div>
  );
}

/**
 * 그룹 안 겹침 배치 (쌓는 방향 a, 수직 방향 b).
 *  - 일반: 길이 안에 맞추되 최소 PILE_STEP.min 만큼은 보이게. 넘치면 다음 줄로 살짝 어긋나게.
 *  - 피  : 5장씩 묶음(살짝 어긋나게)으로 쌓고 묶음끼리 간격을 둔다.
 */
function stackOffsets(n: number, length: number, along: number, isPi: boolean, k = 1): { a: number; b: number }[] {
  if (isPi) {
    const stacks = Math.ceil(n / PI_STACK.size);
    const fit = stacks > 1 ? (length - along - PI_STACK.inner * k * (PI_STACK.size - 1)) / (stacks - 1) : 0;
    const gap = Math.max(12 * k, Math.min(PI_STACK.gap * k, fit));
    return Array.from({ length: n }, (_, i) => {
      const s = Math.floor(i / PI_STACK.size);
      const j = i % PI_STACK.size;
      return { a: s * gap + j * PI_STACK.inner * k, b: j * 1.5 };
    });
  }
  const fit = n > 1 ? (length - along) / (n - 1) : 0;
  const step = Math.min(PILE_STEP.max * k, Math.max(PILE_STEP.min * k, fit));
  const perLine = Math.max(1, Math.floor((length - along) / step) + 1);
  return Array.from({ length: n }, (_, i) => ({
    a: (i % perLine) * step + Math.floor(i / perLine) * (step / 2),
    b: Math.floor(i / perLine) * 10,
  }));
}
