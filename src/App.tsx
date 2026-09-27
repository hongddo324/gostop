import { useEffect, useState } from 'react';
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
import { SEATS } from './game/seats';
import type { HwatuCard } from './game/types';
import { useGameController } from './hooks/useGameController';

const ME = SEATS.find((s) => s.isHuman)!;

export default function App() {
  const { game, motion, bubbles, deal, humanPlay, humanChoose, humanGoStop, speak } = useGameController();
  const observer = game?.observer;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<{ title: string; cards: HwatuCard[] } | null>(null);

  const current = game && game.phase !== 'end' ? currentPlayer(game) : undefined;
  const myTurn = !!game && game.phase === 'play' && current?.seat.isHuman === true;
  const playerOf = (seatId: string) => game?.players.find((p) => p.seat.id === seatId);
  const myHand = playerOf(ME.id)?.hand ?? [];
  const selectedCard = myHand.find((c) => c.id === selectedId);

  // 내 차례가 오면 훈수석(광 판 사람)이 훈수 한마디 (AI 추천 패)
  useEffect(() => {
    if (!myTurn || !game || game.observer.isHuman) return;
    const pick = aiChooseCard(game, myHand);
    const matches = game.field.some((c) => c.month === pick.month);
    speak(game.observer.id, pick.isBonus ? 'hintBonus' : matches ? 'hint' : 'hintDiscard', { month: pick.month }, undefined, 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myTurn]);

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
          const pose = motion[seat.id] ?? (seat.id === observer?.id ? 'observe' : 'idle');
          return <CharacterSprite key={seat.id} seatId={seat.id} pose={pose} {...place} />;
        })}

        {/* 좌석 이름표 + 말풍선 */}
        {SEATS.map((seat) => {
          const tag = NAME_TAG_POS[seat.position];
          if (!tag) return null;
          const p = playerOf(seat.id);
          const isObserver = seat.id === observer?.id;
          return (
            <CharacterSeat
              key={seat.id}
              seat={seat}
              isObserver={isObserver}
              isTurn={current?.seat.id === seat.id}
              handCount={p?.hand.length}
              score={p ? scoreOf(p.captured).total : undefined}
              goCount={p?.goCount}
              bubble={bubbles[seat.id]?.text}
              gwangCount={isObserver ? game?.gwangSale.gwangCount : undefined}
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
        soldHand={game?.observer.isHuman ? game.gwangSale.hand : undefined}
        onSelect={(c) => setSelectedId((prev) => (prev === c.id ? null : c.id))}
        onPlay={handlePlay}
      />

      {/* HUD */}
      <div className="absolute left-4 top-3 z-40 rounded-xl bg-black/45 px-3 py-1.5 text-white">
        <div className="text-lg font-black tracking-tight">우리집 고스톱</div>
        <div className="text-[11px] opacity-80">
          {current ? `${current.seat.name} 차례 · 더미 ${game!.deck.length}장` : '3명 플레이 · 광 판 1명 훈수'}
        </div>
      </div>

      <div className="absolute right-4 top-3 z-40 flex items-center gap-2">
        {game && (
          <div className="rounded-xl bg-black/45 px-3 py-1.5 text-xs font-semibold text-white">
            광 판 사람 · 훈수: <b className="text-amber-300">{game.observer.name}</b>{' '}
            {game.gwangSale.gwangCount > 0 ? `(광 ${game.gwangSale.gwangCount}장)` : '(광 없음)'}
          </div>
        )}
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
          gwangSale={game.gwangSale}
          nameOf={(id) => SEATS.find((s) => s.id === id)?.name ?? id}
          winnerScore={game.result.winnerId ? scoreOf(playerOf(game.result.winnerId)!.captured) : undefined}
          onNext={handleDeal}
        />
      )}
      {zoom && <CardZoom title={zoom.title} cards={zoom.cards} onClose={() => setZoom(null)} />}
    </StageContainer>
  );
}
