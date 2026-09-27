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
  components/
    StageContainer.tsx     고정 해상도 스테이지 + transform scale + 레터박스
    Background.tsx         거실 배경 (이미지 없으면 그라데이션)
    CharacterSeat.tsx      좌석 이름표/역할 뱃지
    Board.tsx              모포 평면(matrix3d): 더미 / 바닥 패 12칸 / 각자 앞 득점 패(광·열끗·띠·피)
    CardZoom.tsx           모포 위 카드 탭 시 확대 보기
    CharacterSprite.tsx    배경과 분리된 캐릭터 스프라이트 + 모션(idle/play/cheer/observe)
    MyHand.tsx             내 손패 전용 우하단 트레이(접기/펼치기, 선택 시 같은 월 바닥 패 강조)
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
