/**
 * 채팅방(카톡) 훈수 말투 — 무엇을 하라는지만 짧게. 이유는 '훈수 듣기' 상세 패널에서 본다.
 * 세 분 모두 나에게 반말: 외할머니 '손주사위'(충청도), 이모부님 '홍서야', 장인어른 '사위'.
 */
import type { HintExplanation, HintReason } from '../logic/hintEngine';

type Templates = Record<HintReason, string>;

const VOICE: Record<string, Templates> = {
  grandma: {
    BONUS: '손주사위, 금딱지부터 내~',
    DEFENSE: '손주사위! {month}월 먼저 가져와. {opponent} {combo} 막어야 혀!',
    COMBO: '손주사위, {card} 내~ {combo} 바로 나는겨!',
    PI_TEN: '손주사위, {card} 내서 피 10장 채워~',
    RISK: '손주사위, {risky}는 참어~ {card} 내는 게 나을겨',
    DISCARD: '손주사위, {month}월 {typeName} 버려~',
    MATCH: '손주사위, {card} 내서 {target} 먹어~',
  },
  uncle: {
    BONUS: '홍서야, 보너스패부터 내!',
    DEFENSE: '홍서야! {month}월 먼저 뺏어와. {opponent} {combo} 막아야 돼!',
    COMBO: '홍서야, {card} 내! {combo} 바로 완성이야~',
    PI_TEN: '홍서야, {card} 내서 피 10장 채워!',
    RISK: '홍서야, {risky}는 참고 {card} 내!',
    DISCARD: '홍서야, {month}월 {typeName} 버려~',
    MATCH: '홍서야, {card} 내서 {target} 먹어!',
  },
  'father-in-law': {
    BONUS: '사위, 보너스패부터 내라.',
    DEFENSE: '사위, {month}월부터 가져와라. {opponent} {combo}부터 막아야 한다.',
    COMBO: '사위, {card} 내라. 바로 {combo} 난다.',
    PI_TEN: '사위, {card} 내서 피 10장 채워라.',
    RISK: '사위, {risky}는 참고 {card} 내라.',
    DISCARD: '사위, {month}월 {typeName} 버려라.',
    MATCH: '사위, {card} 내서 {target} 먹어라.',
  },
};

/** 훈수 한 줄(무엇을 하라는지)을 speakerId 의 말투로. 대사 데이터가 없는 좌석이면 핵심 이유만 */
export function renderHintVoice(hint: HintExplanation, speakerId: string): string {
  const tpl = VOICE[speakerId]?.[hint.reasonCode];
  if (!tpl) return hint.primaryReason;
  return tpl.replace(/\{(\w+)\}/g, (_, k: string) => String(hint.vars[k] ?? ''));
}
