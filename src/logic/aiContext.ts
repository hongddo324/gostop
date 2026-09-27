import { currentPlayer } from '../game/engine';
import { scoreOf } from '../game/scoring';
import type { GameState, PlayerState } from '../game/types';
import type { OpponentState } from './aiEngine';

/** 게임 상태에서 해당 플레이어가 '볼 수 있는' 정보만 뽑는다 (상대 손패·더미 순서는 제외) */
export function visibleContext(s: GameState, me: PlayerState = currentPlayer(s)) {
  const opponents: OpponentState[] = s.players
    .filter((p) => p.seat.id !== me.seat.id)
    .map((p) => ({ id: p.seat.id, name: p.seat.name, captured: p.captured, score: scoreOf(p.captured).total }));
  return {
    hand: me.hand,
    field: s.field,
    opponents,
    deckRemainingCount: s.deck.length,
    myCaptured: me.captured,
    myScore: scoreOf(me.captured).total,
    goCount: me.goCount,
  };
}
