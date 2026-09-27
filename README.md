# 우리집 고스톱 (Family Go-Stop)

가족 분위기의 2D 웹 고스톱. Vite + React + TypeScript + Tailwind CSS v4 → 추후 Capacitor로 Android APK 빌드.

## 실행

```bash
npm install
npm run dev        # 개발 서버
npm test           # 카드/분배 로직 단위 테스트 (vitest)
npm run build      # 타입체크 + 프로덕션 빌드 (dist/, base: './' → Capacitor 대응)
```

## 구조

```
src/
  config/stage.ts          논리 해상도 1280×720 (16:9)
  config/layout.ts         모포 사다리꼴 + 모포 평면 좌표(더미·바닥 12칸·좌석별 득점 패 영역), 캐릭터/이름표 배치
  config/characterFrames.json  캐릭터 프레임 캔버스·기준점 (scripts/slice_characters.py 가 생성)
  lib/homography.ts        직사각형→사다리꼴 투영 변환(CSS matrix3d) — 모포 위 카드를 모포 기울기대로 눕힘
  hooks/useStageScale.ts   뷰포트에 맞춘 비율 유지 배율 계산
  game/                    UI 비의존 순수 로직 (추후 AI/룰엔진 확장 지점)
    types.ts               HwatuCard / PlayerSeat / GameState
    cards.ts               48장 정의(월·종류·띠·쌍피·고도리·비광·국진)
    deal.ts                Fisher–Yates 셔플(RNG 주입), 3인 분배(7/7/7 + 바닥 6 + 더미 21)
    seats.ts               4좌석(나·외할머니·장인어른·이모부님) + 훈수 좌석 분리
    engine.ts              룰 엔진(순수 함수): play → choose → flip → resolve → goStop → end
                           쪽/뻑/따닥/뻑 먹기/싹쓸이, 피 빼앗기, 고/스톱, 광박·피박 정산
    scoring.ts             점수(광·열끗·띠·피, 고도리·홍단·청단·초단), 고 보너스
    rules.ts               집마다 다른 룰 값(고/스톱 기준 3점, 피박 기준 등)
    ai.ts                  AI: 낼 패/먹을 패 선택, 고/스톱 판단 (훈수 추천에도 사용)
  hooks/useGameController.ts  엔진 단계를 타이머로 이어 AI 차례·뒤집기·먹기 자동 진행, 모션/말풍선
  components/
    StageContainer.tsx     고정 해상도 스테이지 + transform scale + 레터박스
    Background.tsx         거실 배경 (이미지 없으면 그라데이션)
    CharacterSeat.tsx      좌석 이름표/역할 뱃지
    Board.tsx              모포 평면(matrix3d): 더미 / 바닥 패 12칸 / 각자 앞 득점 패(광·열끗·띠·피)
    CardZoom.tsx           모포 위 카드 탭 시 확대 보기
    Modals.tsx             먹을 패 선택 / 고·스톱 / 판 결과
    CharacterSprite.tsx    배경과 분리된 캐릭터 스프라이트 + 모션(idle/play/cheer/observe)
    MyHand.tsx             내 손패 전용 우하단 트레이 (탭=선택·같은 월 강조, 한 번 더 탭/‘내기’=내기)
    Card.tsx               카드 (이미지 → 실패 시 텍스트 카드 fallback)
```

## 에셋 규칙

| 용도 | 경로 |
| --- | --- |
| 배경 | `public/assets/bg_livingroom.webp` (1672×941, 16:9 — 거실+모포, 인물 없음) |
| 캐릭터 원본 시트 | `assets-src/characters_play.webp`(대기·패 내기·대기2), `assets-src/characters_cheer.webp`(득점 기쁨 3프레임) — 행: 외할머니/장인어른/이모부님 |
| 캐릭터 프레임 | `public/assets/characters/{seatId}/{play-1..3,cheer-1..3}.webp` ← `python3 scripts/slice_characters.py` |
| 카드 앞면 | `public/assets/cards/{cardId}.webp` (예: `01-gwang.webp`, `03-tti.webp`, `11-pi-1.webp`) |
| 카드 원본 시트 | `assets-src/hwatu_sprite.jpg` (8열×6행) → `python3 scripts/slice_cards.py` 로 48장 생성 |

카드 ID 형식: `{월 2자리}-{gwang|yeol|tti|pi}[-{피 순번}]`. 파일이 없으면 자동으로 텍스트 카드로 표시된다.

> 배경 이미지를 교체하면 `src/config/layout.ts`의 좌표만 다시 맞추면 된다.

## 게임 규칙 (3인 고스톱)

- 턴 순서: 반시계 (나 → 오른쪽 → 가운데 → 왼쪽 중 참가자), 첫 판은 내가 선
- 고/스톱: 3점 이상이고 마지막 고 이후 점수가 오르면 선택. 손패를 다 쓰면 자동 스톱
- 고 보너스: 1고 +1, 2고 +2, 3고부터 (점수+고) × 2^(고-2)
- 박: 광박(승자 광 점수 & 패자 광 0장), 피박(승자 피 점수 & 패자 피 1~5장) 각 ×2
- 특수: 쪽·따닥·뻑 먹기·싹쓸이 → 상대마다 피 1장. 바닥에 같은 월 4장이면 재분배
- 미적용: 흔들기, 폭탄, 총통, 멍따, 고박, 국진 쌍피 전환
