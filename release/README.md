# 월곡이 고스톱 — APK 다운로드

| 버전 | 파일 | 크기 | 비고 |
| --- | --- | --- | --- |
| **v1.1** | [wolgok-gostop-v1.1.apk](./wolgok-gostop-v1.1.apk) | 10.3MB | 타짜 AI 강화(몬테카를로), 선 = 직전 판 승자, 설정에서 사람별 +1만원 |
| v1.0 | [wolgok-gostop-v1.0.apk](./wolgok-gostop-v1.0.apk) | 10.3MB | 디버그 서명 (직접 설치용, 스토어 등록 불가) |

## 설치 방법 (안드로이드 7.0 이상)

1. 위 파일을 누르고 **Download** 버튼(또는 `View raw`)으로 폰에 받는다.
2. 받은 파일을 누르고, "출처를 알 수 없는 앱" 경고가 뜨면 **이 출처 허용**을 켠 뒤 설치한다.
3. 홈 화면의 **월곡이 고스톱** 아이콘으로 실행한다.

새 버전을 설치하면 기존 앱 위에 업데이트되고, 돈·설정 기록은 유지된다.

## 다시 빌드하기

```bash
npm run android:apk
cp android/app/build/outputs/apk/debug/app-debug.apk release/wolgok-gostop-vX.Y.apk
```
