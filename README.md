# 월곡이 고스톱 (Family Go-Stop)

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
  config/stage.ts          논리 해상도 1280×720 (16:9), 장면/손패 패널 분할(HAND_PANEL_H)
  config/layout.ts         모포 사다리꼴 + 모포 평면 좌표(더미·바닥 12칸·좌석별 득점 패 영역), 캐릭터/이름표 배치
  config/characterFrames.json  캐릭터 프레임 캔버스·기준점 (scripts/slice_characters.py 가 생성)
  lib/exitApp.ts           게임 종료 (앱: Capacitor App.exitApp, 웹: 안내)
  lib/homography.ts        직사각형→사다리꼴 투영 변환(CSS matrix3d) — 모포 위 카드를 모포 기울기대로 눕힘
  hooks/useStageScale.ts   뷰포트에 맞춘 비율 유지 배율 계산
  game/                    UI 비의존 순수 로직 (추후 AI/룰엔진 확장 지점)
    types.ts               HwatuCard / PlayerSeat / GameState
    cards.ts               표준 48장(월·종류·띠·쌍피·고도리·비광·국진) + 보너스패 2장(둘 다 쌍피)
    deal.ts                Fisher–Yates 셔플(RNG 주입), 3인 분배(7/7/7 + 바닥 6 + 더미 23), 바닥 보너스는 선이 가져감
    seats.ts               4좌석(나·외할머니·장인어른·이모부님), 광 팔 사람(=훈수) 무작위 선정
    engine.ts              룰 엔진(순수 함수): play → choose → flip → resolve → goStop → end
                           쪽/뻑/따닥/뻑 먹기/싹쓸이, 피 빼앗기, 고/스톱, 광박·피박 정산
    scoring.ts             점수(광·열끗·띠·피, 고도리·홍단·청단·초단), 고 보너스
    rules.ts               집마다 다른 룰 값(고/스톱 기준 3점, 피박 기준, 1점당 금액·시작 금액 등)
    money.ts               돈 정산(광값 + 판돈, 있는 만큼만 지불), 지폐 나누기
  logic/                   AI · 훈수 엔진 (UI 비의존)
    aiEngine.ts            기댓값 휴리스틱 평가: 득점·족보·견제·피 전략·뻑 확률·버림패 안전도
                           evaluateAiMove(hand, field, opponents, deckRemaining, difficulty) — 초급/중급/고급
    hintEngine.ts          getHintExplanation(): 고급 평가 재활용 → 추천 패 + 핵심 이유 + 상세 설명 + 가중치
    aiContext.ts           게임 상태에서 '볼 수 있는 정보'만 추출 (상대 손패·더미 순서 제외)
  settings.ts              난이도 / 배속(1~3배) / 도움 모드 — localStorage 저장
  wallet.ts                좌석별 돈 — localStorage 저장, 설정의 '돈 초기화' 전까지 유지
  content/dialogue.ts      캐릭터별 대사 — 모두 나에게 반말 (외할머니 '손주사위' 충청도 / 이모부님 '홍서야' / 장인어른 '사위')
  content/hintVoice.ts     채팅방 훈수 한 줄(무엇을 하라는지)을 훈수 두는 사람 말투로
  hooks/useGameController.ts  엔진 단계를 타이머로 이어 AI 차례·뒤집기·먹기 자동 진행, 모션/대사
  components/
    StageContainer.tsx     고정 해상도 스테이지 + transform scale + 레터박스
    TitleScreen.tsx        첫 화면: 거실 + 쉬는 가족 + 게임 시작 / 설정 / 게임 종료
    Background.tsx         거실 배경 (이미지 없으면 그라데이션)
    CharacterSeat.tsx      좌석 이름표/역할 뱃지
    Board.tsx              모포 평면(matrix3d): 더미 / 바닥 패 12칸 / 좌석별 득점 영역(가이드선) — 피 포함 모두 펼쳐 놓기, 넘치면 절반 비켜 다음 줄
    CardZoom.tsx           모포 위 카드 탭 시 확대 보기
    Modals.tsx             먹을 패 선택 / 고·스톱 / 판 결과
    SettingsModal.tsx      우상단 ⚙ 설정
    HintPanel.tsx          훈수 듣기 상세 패널 — 왜 유리한가(근거) · 다른 선택과 비교 · 평가 점수
    KakaoChat.tsx          광 판 사람 빈자리의 카톡 스타일 훈수 채팅 (접기/펼치기, 접힌 동안 새 메시지 수)
    MoneyStack.tsx         가진 돈을 지폐 묶음(오만원·만원·오천원·천원)으로 표시
    CharacterSprite.tsx    배경과 분리된 캐릭터 스프라이트 + 모션(idle / rest 쉬는 대기 / play 8프레임 '탁' / cheer / sad 아쉬움 / leave 나가기 / enter 들어오기 / gone)
    MyHand.tsx             장면 아래 내 손패 전용 패널 (탭=선택·같은 월 강조, 한 번 더 탭/‘내기’=내기)
    Card.tsx               카드 (이미지 → 실패 시 텍스트 카드 fallback)
```

## 에셋 규칙

| 용도 | 경로 |
| --- | --- |
| 배경 | `public/assets/bg_livingroom.webp` (1672×941, 16:9 — 거실+모포(앞쪽으로 넓힘), 인물 없음) |
| 캐릭터 원본 시트 | `assets-src/motion_{seatId}.webp`(패 치기 8프레임, 2×4), `assets-src/characters_cheer.webp`(득점 기쁨 3프레임 — 행: 외할머니/이모부님/장인어른), `assets-src/sad_{seatId}.webp`(아쉬움 8프레임, 2×4), `assets-src/leave_{seatId}.webp`(광 팔고 나가기 8프레임, 2×4), `assets-src/rest_{seatId}.webp`(패 없이 쉬는 대기 8프레임, 2×4) |
| 캐릭터 프레임 | `public/assets/characters/{seatId}/{play-1..8,cheer-1..3,sad-1..8,leave-1..8,rest-1..8}.webp` ← `python3 scripts/slice_characters.py` (다리 영역 상호상관으로 프레임 정렬) |
| 훈수 채팅 프로필 | `public/assets/profiles/{grandma,uncle,father-in-law}.webp` (png/jpg 가능, 없으면 이름 첫 글자 아바타) |
| 카드 앞면 | `public/assets/cards/{cardId}.webp` (예: `01-gwang.webp`, `03-tti.webp`, `11-pi-1.webp`) — 보너스패는 코드로 그림 |
| 지폐 | `public/assets/money/{1000,5000,10000,50000}.webp` ← `assets-src/money_sheet.png` + `python3 scripts/slice_money.py` |
| 카드 원본 시트 | `assets-src/hwatu_sprite.jpg` (8열×6행) → `python3 scripts/slice_cards.py` 로 48장 생성 |

카드 ID 형식: `{월 2자리}-{gwang|yeol|tti|pi}[-{피 순번}]`. 파일이 없으면 자동으로 텍스트 카드로 표시된다.

> 배경 이미지를 교체하면 `src/config/layout.ts`의 좌표만 다시 맞추면 된다.

## 게임 규칙 (3인 고스톱)

- 좌석: 나(아래) · 외할머니(왼쪽) · 이모부님(가운데) · 장인어른(오른쪽)
- 광 팔기: 판마다 상대 3명 중 1명을 무작위로 뽑아 7장을 주고, 그 사람은 광을 팔고 빠져 훈수를 둔다 (나는 항상 참여).
  광 판 사람은 일어나 걸어 나가 사라지고, 훈수 모드일 때만 빈자리에서 카톡 채팅으로 훈수 (끄면 아무 말 없음).
  다음 판에 다른 사람이 광을 팔면 나갔던 사람은 걸어 들어와 앉는다.
  광값 = 광 장수 × 1점을 플레이어 1명당 받음. 판 7장은 더미 맨 아래로 돌려 3인 판을 그대로 진행
- 턴 순서: 반시계 (나 → 오른쪽 → 가운데 → 왼쪽 중 참가자), 첫 판은 내가 선
- AI 난이도: 초급(짝 맞는 패 무작위, 고/스톱 반반) · 중급(내 득점만 탐욕, 1고 후 스톱) · 고급(견제+족보+뻑 확률, 냉정한 고/스톱)
- 보너스패 2장(둘 다 쌍피, 피 2장 값): 손에서 내면 바로 가져가고 더미 1장을 받아 한 번 더 냄,
  뒤집어 나오면 가져가고 한 장 더 뒤집음, 분배 때 바닥에 깔리면 선이 가져가고 보충
- 돈: 1점 = 1,000원, 모두 30,000원으로 시작. 판이 끝나면 광값 → 판돈 순서로 정산
  (가진 돈보다 많이 내지 않음 — 빚 없음). 설정에서 '돈 초기화' 전까지 저장
- 고/스톱: 3점 이상이고 마지막 고 이후 점수가 오르면 선택. 손패를 다 쓰면 자동 스톱
- 고 보너스: 1고 +1, 2고 +2, 3고부터 (점수+고) × 2^(고-2)
- 박: 광박(승자 광 점수 & 패자 광 0장), 피박(승자 피 점수 & 패자 피 1~5장) 각 ×2
- 특수: 쪽·따닥·뻑 먹기·싹쓸이 → 상대마다 피 1장. 바닥에 같은 월 4장이면 재분배
- 미적용: 흔들기, 폭탄, 총통, 멍따, 고박, 국진 쌍피 전환
