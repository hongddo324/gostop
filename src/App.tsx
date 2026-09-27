import { useEffect, useState } from 'react';
import { Background } from './components/Background';
import { Board } from './components/Board';
import { CardZoom } from './components/CardZoom';
import { CharacterSeat } from './components/CharacterSeat';
import { CharacterSprite } from './components/CharacterSprite';
import { ChoiceModal, GoStopModal, ResultModal } from './components/Modals';
import { HintPanel } from './components/HintPanel';
import { KakaoChat } from './components/KakaoChat';
import { MoneyStack } from './components/MoneyStack';
import { MyHand } from './components/MyHand';
import { SettingsModal } from './components/SettingsModal';
import { StageContainer } from './components/StageContainer';
import { TitleScreen } from './components/TitleScreen';
import { CHARACTER_PLACEMENT, CHAT_POS, EXIT_DX, MONEY_POS, NAME_TAG_POS, PLAY_ORIGIN } from './config/layout';
import { SCENE_SHIFT, STAGE_HEIGHT, STAGE_WIDTH } from './config/stage';
import { renderHintVoice } from './content/hintVoice';
import { visibleContext } from './logic/aiContext';
import { getHintExplanation, type HintExplanation } from './logic/hintEngine';
import { settleMoney, type MoneySettlement } from './game/money';
import { useSettings } from './settings';
import { useWallets } from './wallet';
import { currentPlayer } from './game/engine';
import { scoreOf } from './game/scoring';
import { SEATS } from './game/seats';
import type { HwatuCard } from './game/types';
import { scaledTiming, useGameController } from './hooks/useGameController';

const ME = SEATS.find((s) => s.isHuman)!;

export default function App() {
  const { settings, update: updateSettings } = useSettings();
  const timing = scaledTiming(settings.speed);
  const { game, motion, bubbles, chat, observerGone, deal, reset, humanPlay, humanChoose, humanGoStop, say } =
    useGameController(settings);
  const observer = game?.observer;
  const [showSettings, setShowSettings] = useState(false);
  /** 첫 화면(타이틀) ↔ 게임 화면 */
  const [screen, setScreen] = useState<'title' | 'game'>('title');
  const [hint, setHint] = useState<HintExplanation | null>(null);
  // 훈수방 접기/펼치기 (기기에 기억) + 접힌 동안 온 새 메시지 수
  const [chatCollapsed, setChatCollapsed] = useState(() => {
    try {
      return localStorage.getItem('gostop.chatCollapsed') === '1';
    } catch {
      return false;
    }
  });
  const [chatSeenSeq, setChatSeenSeq] = useState(0);
  const toggleChat = () =>
    setChatCollapsed((v) => {
      try {
        localStorage.setItem('gostop.chatCollapsed', v ? '0' : '1');
      } catch {
        /* 저장 불가 무시 */
      }
      return !v;
    });
  const { wallets, setWallets, reset: resetWallets } = useWallets();
  const [money, setMoney] = useState<{ game: object; result: MoneySettlement } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<{ title: string; cards: HwatuCard[] } | null>(null);

  const current = game && game.phase !== 'end' ? currentPlayer(game) : undefined;
  const myTurn = !!game && game.phase === 'play' && current?.seat.isHuman === true;
  const playerOf = (seatId: string) => game?.players.find((p) => p.seat.id === seatId);
  const myHand = playerOf(ME.id)?.hand ?? [];
  const selectedCard = myHand.find((c) => c.id === selectedId);

  /** 훈수 엔진(고급 평가) 결과 — 내가 볼 수 있는 정보만 사용 */
  const computeHint = () => {
    if (!game || !myTurn) return null;
    const v = visibleContext(game, playerOf(ME.id));
    return getHintExplanation({ ...v });
  };

  // 내 차례가 오면 (자동 훈수 설정 시) 광 판 사람이 자기 말투로 훈수 한마디
  useEffect(() => {
    setHint(null);
    if (!myTurn || !game || !settings.helpMode || !settings.autoHint) return;
    const h = computeHint();
    if (h) setTimeout(() => say(game.observer.id, renderHintVoice(h, game.observer.id)), 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myTurn]);

  /** 도움 모드: 훈수 듣기 — 상세 패널 + 말풍선 + 추천 패 선택 */
  const handleHint = () => {
    const h = computeHint();
    if (!h || !game) return;
    setHint(h);
    setSelectedId(h.recommendedCardId);
    say(game.observer.id, renderHintVoice(h, game.observer.id));
  };

  // 판이 끝나면 한 번만 돈 정산 (광값 + 판돈) → 저장
  useEffect(() => {
    if (!game || game.phase !== 'end' || money?.game === game) return;
    const result = settleMoney(wallets, game);
    setWallets(result.wallets);
    setMoney({ game, result });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);
  const moneyDelta = (seatId: string) => (game?.phase === 'end' && money?.game === game ? money.result.deltas[seatId] : undefined);

  const handleDeal = () => {
    deal();
    setSelectedId(null);
  };
  const handlePlay = (c: HwatuCard) => {
    humanPlay(c.id);
    setSelectedId(null);
    setHint(null);
  };

  const humanPending = game?.phase === 'choose' && current?.seat.isHuman ? game.pending : undefined;
  const humanGoStopTurn = game?.phase === 'goStop' && current?.seat.isHuman ? current : undefined;
  // 방금 낸 패가 손에서 날아오는 출발점
  const enterFrom = current ? PLAY_ORIGIN[current.seat.position] : undefined;

  const settingsModal = showSettings && (
    <SettingsModal
      settings={settings}
      onChange={updateSettings}
      onClose={() => setShowSettings(false)}
      onResetMoney={resetWallets}
    />
  );

  /** 게임 시작: 게임 화면으로 들어가며 바로 패를 돌린다 */
  const handleStart = () => {
    setScreen('game');
    handleDeal();
  };
  /** 🏠 첫 화면으로 — 진행 중인 판은 정산 없이 접는다 */
  const handleHome = () => {
    if (game && game.phase !== 'end' && !window.confirm('진행 중인 판을 그만두고 처음 화면으로 갈까요? (이번 판은 무효)')) return;
    reset();
    setSelectedId(null);
    setHint(null);
    setScreen('title');
  };

  if (screen === 'title') {
    return (
      <StageContainer>
        <TitleScreen myMoney={wallets[ME.id] ?? 0} onStart={handleStart} onSettings={() => setShowSettings(true)} />
        {settingsModal}
      </StageContainer>
    );
  }

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
          moveMs={timing.cardMove}
          onInspect={(title, cards) => setZoom({ title, cards })}
        />

        {/* 캐릭터 (배경과 분리된 스프라이트) */}
        {SEATS.map((seat) => {
          const place = CHARACTER_PLACEMENT[seat.position];
          if (!place) return null;
          // 광 판 사람은 나가기 모션 후 자리에서 사라진다 (gone)
          // 패를 들고 있지 않을 때(판 시작 전·판 종료·손패 소진)는 쉬는 대기 모션
          const holding = !!game && game.phase !== 'end' && (playerOf(seat.id)?.hand.length ?? 0) > 0;
          const pose = motion[seat.id] ?? (seat.id === observer?.id ? 'gone' : holding ? 'idle' : 'rest');
          return <CharacterSprite key={seat.id} seatId={seat.id} pose={pose} frameMs={timing.playFrame} exitDx={EXIT_DX[seat.position]} {...place} />;
        })}

        {/* 좌석별 돈 (이름표 옆 지폐 묶음) */}
        {SEATS.map((seat) => {
          const pos = MONEY_POS[seat.position];
          if (!pos) return null;
          return (
            <MoneyStack
              key={`money-${seat.id}`}
              amount={wallets[seat.id] ?? 0}
              delta={moneyDelta(seat.id)}
              alignRight={pos.alignRight}
              className="absolute z-30"
              style={{ left: pos.x, top: pos.y, transform: pos.alignRight ? 'translateX(-100%)' : undefined }}
            />
          );
        })}

        {/* 좌석 이름표 + 말풍선 */}
        {SEATS.map((seat) => {
          const tag = NAME_TAG_POS[seat.position];
          if (!tag) return null;
          const p = playerOf(seat.id);
          const isObserver = seat.id === observer?.id;
          if (isObserver && observerGone) return null; // 나간 자리는 이름표 대신 훈수 채팅
          return (
            <CharacterSeat
              key={seat.id}
              seat={seat}
              isObserver={isObserver}
              difficulty={settings.difficulty}
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

        {/* 광 판 사람의 빈자리 — 카톡 스타일 훈수 채팅 (훈수 모드일 때만) */}
        {observer && observerGone && settings.helpMode && CHAT_POS[observer.position] && (
          <KakaoChat
            seat={observer}
            messages={chat}
            {...CHAT_POS[observer.position]!}
            collapsed={chatCollapsed}
            unread={chat.filter((m) => m.seq > chatSeenSeq).length}
            onToggle={() => {
              setChatSeenSeq(chat[chat.length - 1]?.seq ?? 0);
              toggleChat();
            }}
          />
        )}

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
        onHint={settings.helpMode && !game?.observer.isHuman ? handleHint : undefined}
        recommendedId={hint?.recommendedCardId}
        money={wallets[ME.id] ?? 0}
        moneyDelta={moneyDelta(ME.id)}
      />

      {/* HUD */}
      <div className="absolute left-4 top-3 z-40 rounded-xl bg-black/45 px-3 py-1.5 text-white">
        <div className="text-lg font-black tracking-tight">월곡이 고스톱</div>
        <div className="text-[11px] opacity-80">
          {current ? `${current.seat.name} 차례 · 더미 ${game!.deck.length}장` : '3명 플레이 · 광 판 1명 훈수'} ·{' '}
          {settings.speed}배속
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
          onClick={handleHome}
          className="rounded-xl bg-black/45 px-3 py-2 text-lg font-black text-white"
          aria-label="처음 화면"
        >
          🏠
        </button>
        <button
          type="button"
          onClick={() => setShowSettings(true)}
          className="rounded-xl bg-black/45 px-3 py-2 text-lg font-black text-white"
          aria-label="설정"
        >
          ⚙
        </button>
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
          moneyDeltas={money?.game === game ? money.result.deltas : undefined}
          nameOf={(id) => SEATS.find((s) => s.id === id)?.name ?? id}
          winnerScore={game.result.winnerId ? scoreOf(playerOf(game.result.winnerId)!.captured) : undefined}
          onNext={handleDeal}
        />
      )}
      {hint && myTurn && observer && (
        <HintPanel
          hint={hint}
          card={myHand.find((c) => c.id === hint.recommendedCardId)}
          adviser={observer.name}
          onClose={() => setHint(null)}
        />
      )}
      {zoom && <CardZoom title={zoom.title} cards={zoom.cards} onClose={() => setZoom(null)} />}
      {settingsModal}
    </StageContainer>
  );
}
