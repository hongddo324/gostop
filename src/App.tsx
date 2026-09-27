import { useMemo, useState } from 'react';
import { Background } from './components/Background';
import { Board } from './components/Board';
import { CharacterSeat } from './components/CharacterSeat';
import { MyHand } from './components/MyHand';
import { OpponentHand } from './components/OpponentHand';
import { StageContainer } from './components/StageContainer';
import { dealGame } from './game/deal';
import { SEATS, splitSeats } from './game/seats';
import type { GameState } from './game/types';
import { SEAT_LAYOUT } from './config/layout';

export default function App() {
  const [observerId, setObserverId] = useState('uncle');
  const [game, setGame] = useState<GameState | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { players, observer } = useMemo(() => splitSeats(observerId), [observerId]);

  const handleDeal = () => {
    setGame(dealGame(players, observer));
    setSelectedId(null);
  };

  const handleObserverChange = (id: string) => {
    setObserverId(id);
    setGame(null); // 좌석 구성이 바뀌면 판을 초기화
    setSelectedId(null);
  };

  const handOf = (seatId: string) => game?.players.find((p) => p.seat.id === seatId)?.hand ?? [];
  const me = SEATS.find((s) => s.isHuman)!;
  const myHand = handOf(me.id);
  const selectedCard = myHand.find((c) => c.id === selectedId);

  return (
    <StageContainer>
      <Background />

      {/* 좌석 이름표 + AI 손패 (캐릭터는 배경에 포함) */}
      {SEATS.map((seat) => {
        const layout = SEAT_LAYOUT[seat.position];
        const isObserver = seat.id === observer.id;
        const hand = handOf(seat.id);
        return (
          <div key={seat.id}>
            {!seat.isHuman && !isObserver && layout.hand && (
              <OpponentHand cards={hand} pose={layout.hand} />
            )}
            {layout.nameTag && (
              <CharacterSeat
                seat={seat}
                isObserver={isObserver}
                handCount={game ? hand.length : undefined}
                x={layout.nameTag.x}
                y={layout.nameTag.y}
              />
            )}
          </div>
        );
      })}

      <Board
        field={game?.field ?? []}
        deckCount={game?.deck.length ?? 0}
        dealt={game !== null}
        highlightMonth={selectedCard?.month}
      />

      <MyHand
        cards={myHand}
        selectedId={selectedId}
        onSelect={(c) => setSelectedId((prev) => (prev === c.id ? null : c.id))}
      />

      {/* HUD */}
      <div className="absolute left-4 top-3 rounded-xl bg-black/45 px-3 py-1.5 text-white">
        <div className="text-lg font-black tracking-tight">우리집 고스톱</div>
        <div className="text-[11px] opacity-80">3인 플레이 · 1명 훈수</div>
      </div>

      <div className="absolute right-4 top-3 flex items-center gap-2">
        <label className="flex items-center gap-1 rounded-xl bg-black/45 px-2 py-1.5 text-xs font-semibold text-white">
          훈수
          <select
            value={observerId}
            onChange={(e) => handleObserverChange(e.target.value)}
            className="rounded bg-white/90 px-1 py-0.5 text-stone-800"
          >
            {SEATS.filter((s) => !s.isHuman).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={handleDeal}
          className="rounded-xl bg-amber-500 px-5 py-2 text-base font-black text-white shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none"
        >
          {game ? '다시 돌리기' : '패 돌리기'}
        </button>
      </div>
    </StageContainer>
  );
}
