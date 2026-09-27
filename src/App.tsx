import { useEffect, useMemo, useState } from 'react';
import { Background } from './components/Background';
import { Board } from './components/Board';
import { CardZoom } from './components/CardZoom';
import { CharacterSeat } from './components/CharacterSeat';
import { CharacterSprite } from './components/CharacterSprite';
import { ChoiceModal, GoStopModal, ResultModal } from './components/Modals';
import { MyHand } from './components/MyHand';
import { StageContainer } from './components/StageContainer';
import { CHARACTER_PLACEMENT, NAME_TAG_POS, PLAY_ORIGIN } from './config/layout';
import { SCENE_SHIFT, STAGE_HEIGHT, STAGE_WIDTH } from './config/stage';
import { aiChooseCard } from './game/ai';
import { currentPlayer } from './game/engine';
import { scoreOf } from './game/scoring';
import { SEATS, splitSeats } from './game/seats';
import type { HwatuCard } from './game/types';
import { useGameController } from './hooks/useGameController';

const ME = SEATS.find((s) => s.isHuman)!;

export default function App() {
  const [observerId, setObserverId] = useState('uncle');
  const { players, observer } = useMemo(() => splitSeats(observerId), [observerId]);
  const { game, motion, bubbles, deal, reset, humanPlay, humanChoose, humanGoStop } = useGameController(
    players,
    observer,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<{ title: string; cards: HwatuCard[] } | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const current = game && game.phase !== 'end' ? currentPlayer(game) : undefined;
  const myTurn = !!game && game.phase === 'play' && current?.seat.isHuman === true;
  const playerOf = (seatId: string) => game?.players.find((p) => p.seat.id === seatId);
  const myHand = playerOf(ME.id)?.hand ?? [];
  const selectedCard = myHand.find((c) => c.id === selectedId);

  // 내 차례가 오면 훈수석에서 한 마디 (AI 추천 패)
  useEffect(() => {
    if (!myTurn || !game) return setHint(null);
    const pick = aiChooseCard(game, myHand);
    const matches = game.field.some((c) => c.month === pick.month);
    setHint(
      pick.isBonus ? '보너스패부터 내게~' : matches ? `${pick.month}월 내서 먹어봐~` : `${pick.month}월 버려도 되겠네`,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myTurn]);

  const handleObserverChange = (id: string) => {
    setObserverId(id);
    reset();
    setSelectedId(null);
  };
  const handleDeal = () => {
    deal();
    setSelectedId(null);
  };
  const handlePlay = (c: HwatuCard) => {
    humanPlay(c.id);
    setSelectedId(null);
  };

  const humanPending = game?.phase === 'choose' && current?.seat.isHuman ? game.pending : undefined;
  const humanGoStopTurn = game?.phase === 'goStop' && current?.seat.isHuman ? current : undefined;
  // 방금 낸 패가 손에서 날아오는 출발점
  const enterFrom = current ? PLAY_ORIGIN[current.seat.position] : undefined;

  return (
    <StageContainer>
      {/* ── 게임 장면 (배경 좌표계, 손패 패널 높이만큼 위로 올림) ── */}
      <div
        className="absolute left-0 top-0"
        style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT, transform: `translateY(${-SCENE_SHIFT}px)` }}
      >
        <Background />

        {/* 모포 위 카드 (캐릭터보다 아래 레이어 — 팔/무릎이 카드를 가리도록) */}
        <Board
          field={game?.field ?? []}
          deck={game?.deck ?? []}
          captures={game?.players.map((p) => ({ position: p.seat.position, name: p.seat.name, cards: p.captured })) ?? []}
          highlightMonth={myTurn ? selectedCard?.month : undefined}
          enterFrom={enterFrom}
          onInspect={(title, cards) => setZoom({ title, cards })}
        />

        {/* 캐릭터 (배경과 분리된 스프라이트) */}
        {SEATS.map((seat) => {
          const place = CHARACTER_PLACEMENT[seat.position];
          if (!place) return null;
          const pose = motion[seat.id] ?? (seat.id === observer.id ? 'observe' : 'idle');
          return <CharacterSprite key={seat.id} seatId={seat.id} pose={pose} {...place} />;
        })}

        {/* 좌석 이름표 + 말풍선 */}
        {SEATS.map((seat) => {
          const tag = NAME_TAG_POS[seat.position];
          if (!tag) return null;
          const p = playerOf(seat.id);
          const isObserver = seat.id === observer.id;
          return (
            <CharacterSeat
              key={seat.id}
              seat={seat}
              isObserver={isObserver}
              isTurn={current?.seat.id === seat.id}
              handCount={p?.hand.length}
              score={p ? scoreOf(p.captured).total : undefined}
              goCount={p?.goCount}
              bubble={bubbles[seat.id]?.text ?? (isObserver ? (hint ?? '허허, 잘 보고 내야지~') : undefined)}
              x={tag.x}
              y={tag.y}
            />
          );
        })}

        {/* 내 말풍선 (쪽!/고! 등) — 화면 아래 가운데 */}
        {bubbles[ME.id] && (
          <div
            key={bubbles[ME.id]!.seq}
            className="pointer-events-none absolute left-[560px] top-[600px] z-40 animate-[pop_.25s_ease-out] rounded-2xl bg-white px-5 py-2 text-3xl font-black text-rose-600 shadow-xl"
          >
            {bubbles[ME.id]!.text}
          </div>
        )}

        {!game && (
          <div className="absolute left-[360px] top-[540px] w-[560px] text-center">
            <span className="rounded-xl bg-black/55 px-5 py-2 text-lg font-bold text-white">
              ‘패 돌리기’를 눌러 시작하세요
            </span>
          </div>
        )}
      </div>

      {/* ── 내 손패 전용 패널 ── */}
      <MyHand
        cards={myHand}
        selectedId={selectedId}
        myTurn={myTurn}
        score={game ? scoreOf(playerOf(ME.id)?.captured ?? []).total : undefined}
        goCount={playerOf(ME.id)?.goCount}
        onSelect={(c) => setSelectedId((prev) => (prev === c.id ? null : c.id))}
        onPlay={handlePlay}
      />

      {/* HUD */}
      <div className="absolute left-4 top-3 z-40 rounded-xl bg-black/45 px-3 py-1.5 text-white">
        <div className="text-lg font-black tracking-tight">우리집 고스톱</div>
        <div className="text-[11px] opacity-80">
          {current ? `${current.seat.name} 차례 · 더미 ${game!.deck.length}장` : '3인 플레이 · 1명 훈수'}
        </div>
      </div>

      <div className="absolute right-4 top-3 z-40 flex items-center gap-2">
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
          {game ? '새 판' : '패 돌리기'}
        </button>
      </div>

      {humanPending && <ChoiceModal pending={humanPending} onChoose={(c) => humanChoose(c.id)} />}
      {humanGoStopTurn && (
        <GoStopModal player={humanGoStopTurn} score={scoreOf(humanGoStopTurn.captured)} onDecide={humanGoStop} />
      )}
      {game?.phase === 'end' && game.result && (
        <ResultModal
          result={game.result}
          nameOf={(id) => SEATS.find((s) => s.id === id)?.name ?? id}
          winnerScore={game.result.winnerId ? scoreOf(playerOf(game.result.winnerId)!.captured) : undefined}
          onNext={handleDeal}
        />
      )}
      {zoom && <CardZoom title={zoom.title} cards={zoom.cards} onClose={() => setZoom(null)} />}
    </StageContainer>
  );
}
