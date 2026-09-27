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
  hooks/useStageScale.ts   뷰포트에 맞춘 비율 유지 배율 계산
  game/                    UI 비의존 순수 로직 (추후 AI/룰엔진 확장 지점)
    types.ts               HwatuCard / PlayerSeat / GameState
    cards.ts               48장 정의(월·종류·띠·쌍피·고도리·비광·국진)
    deal.ts                Fisher–Yates 셔플(RNG 주입), 3인 분배(7/7/7 + 바닥 6 + 더미 21)
    seats.ts               4좌석(나·외할머니·장인어른·이모부님) + 훈수 좌석 분리
  components/
    StageContainer.tsx     고정 해상도 스테이지 + transform scale + 레터박스
    Background.tsx         거실 배경 (이미지 없으면 그라데이션)
    CharacterSeat.tsx      캐릭터 플레이스홀더
    Board.tsx              모포 / 더미 / 바닥 패 12칸(같은 월 겹침)
    OpponentHand.tsx       AI 손패(뒷면)
    MyHand.tsx             내 손패
    Card.tsx               카드 (이미지 → 실패 시 텍스트 카드 fallback)
```

## 에셋 규칙

| 용도 | 경로 |
| --- | --- |
| 배경 | `public/assets/bg_livingroom.png` |
| 카드 앞면 | `public/assets/cards/{cardId}.png` (예: `01-gwang.png`, `03-tti.png`, `11-pi-1.png`) |

카드 ID 형식: `{월 2자리}-{gwang|yeol|tti|pi}[-{피 순번}]`. 파일이 없으면 자동으로 텍스트 카드로 표시된다.
