import { shuffle, type Rng } from './deal';
import type { GameState } from './types';

/**
 * [개발용] 득점 패 레이아웃/캐릭터 모션 확인을 위해 더미에서 임의로 카드를 꺼내 득점 패로 옮긴다.
 * seatId 를 주면 그 플레이어만, 없으면 전원. 실제 먹기 규칙은 2단계 룰 엔진에서 구현한다.
 */
export function demoCapture(state: GameState, perPlayer = 3, seatId?: string, rng: Rng = Math.random): GameState {
  const deck = shuffle(state.deck, rng);
  const players = state.players.map((p) => {
    if (seatId && p.seat.id !== seatId) return p;
    const taken = deck.splice(0, Math.min(perPlayer, deck.length));
    return { ...p, captured: [...p.captured, ...taken] };
  });
  return { ...state, players, deck };
}
