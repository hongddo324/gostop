import type { HwatuCard } from './types';

export interface ScoreBreakdown {
  gwang: number;
  yeol: number;
  tti: number;
  pi: number;
  /** 고도리/홍단/청단/초단 */
  combos: string[];
  total: number;
  /** 피 장수 (쌍피 = 2) */
  piCount: number;
  gwangCount: number;
}

const has = (cards: HwatuCard[], pred: (c: HwatuCard) => boolean, n: number) => cards.filter(pred).length >= n;

/**
 * 득점 패로 점수 계산.
 *  광  : 3광 3점(비광 포함 시 2점), 4광 4점, 5광 15점
 *  열끗: 5장 1점 + 이후 1장당 1점, 고도리(2·4·8월 새) 5점
 *  띠  : 5장 1점 + 이후 1장당 1점, 홍단/청단/초단 각 3점
 *  피  : 10장 1점 + 이후 1장당 1점 (쌍피 = 2장)
 *  국진(9월 열끗)은 열끗으로 계산한다.
 */
export function scoreOf(captured: HwatuCard[]): ScoreBreakdown {
  const gw = captured.filter((c) => c.type === 'gwang');
  const yeol = captured.filter((c) => c.type === 'yeol');
  const tti = captured.filter((c) => c.type === 'tti');
  const piCount = captured.reduce((sum, c) => sum + c.piValue, 0);
  const combos: string[] = [];

  let gwang = 0;
  if (gw.length === 5) gwang = 15;
  else if (gw.length === 4) gwang = 4;
  else if (gw.length === 3) gwang = gw.some((c) => c.isBiGwang) ? 2 : 3;

  let yeolScore = yeol.length >= 5 ? yeol.length - 4 : 0;
  if (has(yeol, (c) => !!c.isGodori, 3)) {
    yeolScore += 5;
    combos.push('고도리');
  }

  let ttiScore = tti.length >= 5 ? tti.length - 4 : 0;
  for (const [kind, label] of [
    ['hong', '홍단'],
    ['cheong', '청단'],
    ['cho', '초단'],
  ] as const) {
    if (has(tti, (c) => c.ribbon === kind, 3)) {
      ttiScore += 3;
      combos.push(label);
    }
  }

  const pi = piCount >= 10 ? piCount - 9 : 0;

  return {
    gwang,
    yeol: yeolScore,
    tti: ttiScore,
    pi,
    combos,
    total: gwang + yeolScore + ttiScore + pi,
    piCount,
    gwangCount: gw.length,
  };
}

/** 고 보너스: 1고 +1, 2고 +2, 3고부터 (점수+고) × 2^(고-2) */
export function applyGoBonus(base: number, goCount: number): number {
  if (goCount <= 2) return base + goCount;
  return (base + goCount) * 2 ** (goCount - 2);
}
