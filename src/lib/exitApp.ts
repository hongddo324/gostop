import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

/** Android APK(Capacitor)로 실행 중인지 */
export const isNativeApp = () => Capacitor.isNativePlatform();

/**
 * 게임 종료.
 *  - Android APK: App.exitApp()
 *  - 웹: 스크립트로 연 창이 아니면 브라우저가 닫기를 막으므로 false 를 돌려 안내 문구를 띄운다
 */
export function exitApp(): boolean {
  if (isNativeApp()) {
    void CapApp.exitApp();
    return true;
  }
  window.close();
  return window.closed;
}

/** Android 뒤로가기 버튼 — 핸들러를 등록하고 해제 함수를 돌려준다 (웹에서는 아무것도 안 함) */
export function onBackButton(handler: () => void): () => void {
  if (!isNativeApp()) return () => {};
  const sub = CapApp.addListener('backButton', handler);
  return () => void sub.then((h) => h.remove());
}
