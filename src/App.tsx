import { useEffect, useMemo, useRef, useState } from 'react';
import { Background } from './components/Background';
import { Board } from './components/Board';
import { CardZoom } from './components/CardZoom';
import { CharacterSeat } from './components/CharacterSeat';
import { CharacterSprite, type CharacterPose } from './components/CharacterSprite';
import { MyHand } from './components/MyHand';
import { StageContainer } from './components/StageContainer';
import { CHARACTER_PLACEMENT, NAME_TAG_POS } from './config/layout';
import { dealGame } from './game/deal';
import { demoCapture } from './game/demo';
import { SEATS, splitSeats } from './game/seats';
import type { GameState, HwatuCard } from './game/types';

/** 모션 연출 시간 (ms) */
const PLAY_MS = 700;
const CHEER_MS = 1800;

export default function App() {
  const [observerId, setObserverId] = useState('uncle');
  const [game, setGame] = useState<GameState | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<{ title: string; cards: HwatuCard[] } | null>(null);
  /** 좌석별 일시 모션 (없으면 기본: 플레이어 idle / 훈수 observe) */
  const [motion, setMotion] = useState<Record<string, CharacterPose>>({});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const { players, observer } = useMemo(() => splitSeats(observerId), [observerId]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setMotion({});
  };
  useEffect(() => clearTimers, []);

  const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
  const setPose = (seatId: string, pose: CharacterPose | null) =>
    setMotion((m) => {
      const next = { ...m };
      if (pose) next[seatId] = pose;
      else delete next[seatId];
      return next;
    });

  const handleDeal = () => {
    clearTimers();
    setGame(dealGame(players, observer));
    setSelectedId(null);
  };

  const handleObserverChange = (id: string) => {
    clearTimers();
    setObserverId(id);
    setGame(null); // 좌석 구성이 바뀌면 판을 초기화
    setSelectedId(null);
  };

  /** [개발용] AI 가 차례로 패를 내고(play) → 득점 → 좋아하는(cheer) 연출 */
  const handleDemoTurns = () => {
    if (!game) return;
    clearTimers();
    const ais = game.players.filter((p) => !p.seat.isHuman);
    const step = PLAY_MS + CHEER_MS;
    ais.forEach((p, i) => {
      const t = i * step;
      later(t, () => setPose(p.seat.id, 'play'));
      later(t + PLAY_MS, () => {
        setGame((g) => g && demoCapture(g, 3, p.seat.id));
        setPose(p.seat.id, 'cheer');
      });
      later(t + step, () => setPose(p.seat.id, null));
    });
    // 내 득점 패도 함께 채워 배치 확인
    later(ais.length * step, () => setGame((g) => g && demoCapture(g, 3, SEATS.find((s) => s.isHuman)!.id)));
  };

  const handOf = (seatId: string) => game?.players.find((p) => p.seat.id === seatId)?.hand ?? [];
  const me = SEATS.find((s) => s.isHuman)!;
  const myHand = handOf(me.id);
  const selectedCard = myHand.find((c) => c.id === selectedId);

  return (
    <StageContainer>
      <Background />

      {/* 모포 위 카드 (캐릭터보다 아래 레이어 — 무릎/팔이 카드를 가리도록) */}
      <Board
        field={game?.field ?? []}
        deckCount={game?.deck.length ?? 0}
        captures={game?.players.map((p) => ({ position: p.seat.position, name: p.seat.name, cards: p.captured })) ?? []}
        highlightMonth={selectedCard?.month}
        onInspect={(title, cards) => setZoom({ title, cards })}
      />

      {/* 캐릭터 (배경과 분리된 스프라이트) */}
      {SEATS.map((seat) => {
        const place = CHARACTER_PLACEMENT[seat.position];
        if (!place) return null;
        const pose = motion[seat.id] ?? (seat.id === observer.id ? 'observe' : 'idle');
        return <CharacterSprite key={seat.id} seatId={seat.id} pose={pose} {...place} />;
      })}

      {/* 좌석 이름표 */}
      {SEATS.map((seat) => {
        const tag = NAME_TAG_POS[seat.position];
        if (!tag) return null;
        return (
          <CharacterSeat
            key={seat.id}
            seat={seat}
            isObserver={seat.id === observer.id}
            handCount={game ? handOf(seat.id).length : undefined}
            x={tag.x}
            y={tag.y}
          />
        );
      })}

      {!game && (
        <div className="absolute left-[340px] top-[495px] w-[560px] text-center">
          <span className="rounded-xl bg-black/55 px-5 py-2 text-lg font-bold text-white">
            ‘패 돌리기’를 눌러 시작하세요
          </span>
        </div>
      )}

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
        {game && (
          <button
            type="button"
            onClick={handleDemoTurns}
            disabled={game.deck.length === 0}
            className="rounded-xl bg-black/45 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
            title="개발용: AI가 차례로 패를 내고 득점해 좋아하는 모션 확인"
          >
            모션 예시(테스트)
          </button>
        )}
        <button
          type="button"
          onClick={handleDeal}
          className="rounded-xl bg-amber-500 px-5 py-2 text-base font-black text-white shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none"
        >
          {game ? '다시 돌리기' : '패 돌리기'}
        </button>
      </div>

      {zoom && <CardZoom title={zoom.title} cards={zoom.cards} onClose={() => setZoom(null)} />}
    </StageContainer>
  );
}
