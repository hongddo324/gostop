import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hongddo.wolgokgostop',
  appName: '월곡이 고스톱',
  webDir: 'dist',
  android: {
    // 웹 콘텐츠 디버깅은 개발 빌드에서만
    webContentsDebuggingEnabled: false,
  },
};

export default config;
