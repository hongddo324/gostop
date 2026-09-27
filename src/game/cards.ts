import type { CardType, HwatuCard, Month, RibbonKind } from './types';

/** 월별 꽃 이름 (카드 fallback 표기 및 툴팁용) */
export const MONTH_NAMES: Record<Month, string> = {
  1: '송학',
  2: '매조',
  3: '사쿠라',
  4: '흑싸리',
  5: '난초',
  6: '모란',
  7: '홍싸리',
  8: '공산',
  9: '국진',
  10: '단풍',
  11: '오동',
  12: '비',
  13: '보너스',
};

export const CARD_TYPE_LABEL: Record<CardType, string> = {
  gwang: '광',
  yeol: '열끗',
  tti: '띠',
  pi: '피',
};

const RIBBON_LABEL: Record<RibbonKind, string> = {
  hong: '홍단',
  cheong: '청단',
  cho: '초단',
  plain: '띠',
};

type Spec =
  | { type: 'gwang'; biGwang?: boolean }
  | { type: 'yeol'; godori?: boolean; gukjin?: boolean }
  | { type: 'tti'; ribbon: RibbonKind }
  | { type: 'pi'; double?: boolean };

/**
 * 월별 4장 구성표 (표준 화투 48장).
 * 11월 오동/12월 비의 쌍피는 일반적인 맞고 룰 기준.
 */
const DECK_SPEC: Record<Exclude<Month, 13>, [Spec, Spec, Spec, Spec]> = {
  1: [{ type: 'gwang' }, { type: 'tti', ribbon: 'hong' }, { type: 'pi' }, { type: 'pi' }],
  2: [{ type: 'yeol', godori: true }, { type: 'tti', ribbon: 'hong' }, { type: 'pi' }, { type: 'pi' }],
  3: [{ type: 'gwang' }, { type: 'tti', ribbon: 'hong' }, { type: 'pi' }, { type: 'pi' }],
  4: [{ type: 'yeol', godori: true }, { type: 'tti', ribbon: 'cho' }, { type: 'pi' }, { type: 'pi' }],
  5: [{ type: 'yeol' }, { type: 'tti', ribbon: 'cho' }, { type: 'pi' }, { type: 'pi' }],
  6: [{ type: 'yeol' }, { type: 'tti', ribbon: 'cheong' }, { type: 'pi' }, { type: 'pi' }],
  7: [{ type: 'yeol' }, { type: 'tti', ribbon: 'cho' }, { type: 'pi' }, { type: 'pi' }],
  8: [{ type: 'gwang' }, { type: 'yeol', godori: true }, { type: 'pi' }, { type: 'pi' }],
  9: [{ type: 'yeol', gukjin: true }, { type: 'tti', ribbon: 'cheong' }, { type: 'pi' }, { type: 'pi' }],
  10: [{ type: 'yeol' }, { type: 'tti', ribbon: 'cheong' }, { type: 'pi' }, { type: 'pi' }],
  11: [{ type: 'gwang' }, { type: 'pi', double: true }, { type: 'pi' }, { type: 'pi' }],
  12: [{ type: 'gwang', biGwang: true }, { type: 'yeol' }, { type: 'tti', ribbon: 'plain' }, { type: 'pi', double: true }],
};

const pad2 = (n: number) => String(n).padStart(2, '0');

function buildCard(month: Exclude<Month, 13>, spec: Spec, idSuffix: string): HwatuCard {
  const flower = MONTH_NAMES[month];
  const base = { id: `${pad2(month)}-${spec.type}${idSuffix}`, month, type: spec.type };

  switch (spec.type) {
    case 'gwang':
      return { ...base, name: `${month}월 ${flower} 광`, piValue: 0, isBiGwang: spec.biGwang };
    case 'yeol':
      return {
        ...base,
        name: `${month}월 ${flower} ${spec.godori ? '고도리' : '열끗'}`,
        piValue: 0,
        isGodori: spec.godori,
        isGukjin: spec.gukjin,
      };
    case 'tti':
      return { ...base, name: `${month}월 ${RIBBON_LABEL[spec.ribbon]}`, piValue: 0, ribbon: spec.ribbon };
    case 'pi':
      return { ...base, name: `${month}월 ${spec.double ? '쌍피' : '피'}`, piValue: spec.double ? 2 : 1 };
  }
}

/** 보너스패 2장: 쌍피(피 2장 값), 쓰리피(피 3장 값) */
export const BONUS_CARDS: readonly HwatuCard[] = [
  { id: 'bonus-2', month: 13, type: 'pi', name: '보너스 쌍피', piValue: 2, isBonus: true },
  { id: 'bonus-3', month: 13, type: 'pi', name: '보너스 쓰리피', piValue: 3, isBonus: true },
];

/** 전체 카드 생성: 표준 48장 + 보너스 2장 = 50장 (순서 고정, 불변) */
export function createDeck(): HwatuCard[] {
  return [...createStandardDeck(), ...BONUS_CARDS];
}

/** 표준 화투 48장 */
export function createStandardDeck(): HwatuCard[] {
  const cards: HwatuCard[] = [];
  for (let m = 1; m <= 12; m++) {
    const month = m as Exclude<Month, 13>;
    let piSeq = 0;
    for (const spec of DECK_SPEC[month]) {
      const suffix = spec.type === 'pi' ? `-${++piSeq}` : '';
      cards.push(buildCard(month, spec, suffix));
    }
  }
  return cards;
}

/** 카드 이미지 경로 규칙: public/assets/cards/{id}.webp */
export function cardImageUrl(card: HwatuCard): string {
  return `${import.meta.env.BASE_URL}assets/cards/${card.id}.webp`;
}
