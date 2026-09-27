/**
 * 훈수 말투 변환 — hintEngine 의 reasonCode + vars 를 훈수 두는 사람(광 판 사람)의 말투로 바꾼다.
 * 세 분 모두 나에게 반말: 외할머니 '손주사위'(충청도), 이모부님 '홍서', 장인어른 '사위'.
 */
import type { HintExplanation, HintReason } from '../logic/hintEngine';

type Templates = Record<HintReason, string>;

const VOICE: Record<string, Templates> = {
  grandma: {
    BONUS: '손주사위, 그 금딱지부터 내~ 내자마자 네 거여, 한 장 더 받구!',
    DEFENSE: '손주사위! {opponent} {combo}까지 딱 한 장({month}월) 남었어~ 네 점수보다 그거부터 가로채야 혀!',
    COMBO: '손주사위, 그거 먹으믄 {combo}({points}점) 바로 나는겨! 제일 확실혀~',
    PI_TEN: '지금 피가 {pi}장이여. 이번에 {piCard} 가져오믄 10장 채워서 피박 면허구 판이 확 유리혀져~',
    RISK: '{risky} 내믄 뻑 날 것 같어~ 남은 패 세어보니께 위험혀. {card} 내는 게 나을겨.',
    DISCARD: '바닥에 짝이 읎네~ 남들 노리는 거랑 상관읎는 {month}월 {typeName} 버려. 그게 제일 안전혀.',
    MATCH: '손주사위, {card} 내서 {target} 먹어~ 그게 지금 제일 이득이여.',
  },
  uncle: {
    BONUS: '홍서, 보너스패부터! 내자마자 네 거고 한 장 더 받잖아~',
    DEFENSE: '홍서! {opponent} {combo}까지 딱 한 장({month}월) 남았어. 네 점수보다 그거 먼저 뺏어와야 돼!',
    COMBO: '홍서, 그거 먹으면 {combo}({points}점) 바로 완성이야! 이게 제일 확실한 길이지~',
    PI_TEN: '홍서 지금 피 {pi}장이지? {piCard} 가져와서 10장 채우면 피박 탈출에 판도 유리해져!',
    RISK: '{risky} 내면 뻑 날 확률 높아~ 남은 패 세어봤거든. 차라리 {card} 내!',
    DISCARD: '짝이 없네~ 남들 노리는 거랑 상관없는 {month}월 {typeName} 버려. 그게 제일 안전해.',
    MATCH: '홍서, {card} 내서 {target} 먹어! 지금은 그게 제일 남는 장사야~',
  },
  'father-in-law': {
    BONUS: '사위, 보너스패부터 내라. 바로 네 것이 되고 한 장 더 받는다.',
    DEFENSE: '사위, {opponent} {combo}까지 {month}월 한 장 남았다. 네 점수보다 그걸 먼저 끊어라.',
    COMBO: '사위, 그걸 먹으면 {combo}({points}점)이 바로 난다. 가장 확실한 길이다.',
    PI_TEN: '지금 피가 {pi}장이다. {piCard} 가져와 10장 채우면 피박도 면하고 판이 유리해진다.',
    RISK: '{risky}는 뻑 날 위험이 크다. 남은 패를 세어보면 알지. {card} 내라.',
    DISCARD: '짝이 없구나. 남이 노리는 족보와 상관없는 {month}월 {typeName} 버려라. 그게 제일 안전하다.',
    MATCH: '사위, {card} 내서 {target} 먹어라. 지금은 그게 가장 이득이다.',
  },
};

/** 훈수를 speakerId 의 말투로. 대사 데이터가 없는 좌석이면 중립 설명을 그대로 쓴다 */
export function renderHintVoice(hint: HintExplanation, speakerId: string): string {
  const tpl = VOICE[speakerId]?.[hint.reasonCode];
  if (!tpl) return hint.detailedExplanation;
  return tpl.replace(/\{(\w+)\}/g, (_, k: string) => String(hint.vars[k] ?? ''));
}
