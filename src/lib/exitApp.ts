/**
 * 게임 종료.
 *  - Android APK(Capacitor): @capacitor/app 의 App.exitApp() — 플러그인이 등록돼 있으면 전역 Capacitor 로 호출
 *  - 웹: 스크립트로 연 창이 아니면 브라우저가 닫기를 막으므로 false 를 돌려 안내 문구를 띄운다
 */
export function exitApp(): boolean {
  const cap = (window as unknown as { Capacitor?: { Plugins?: { App?: { exitApp?: () => void } } } }).Capacitor;
  const exit = cap?.Plugins?.App?.exitApp;
  if (exit) {
    exit();
    return true;
  }
  window.close();
  return window.closed;
}
