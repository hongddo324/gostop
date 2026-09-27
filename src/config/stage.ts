/**
 * 논리 해상도(디자인 기준). 모든 레이아웃은 이 좌표계(px)로 작성하고,
 * 실제 화면에는 StageContainer가 비율을 유지한 채 transform: scale 로 맞춘다.
 *
 * 16:9 가로 기준. 기기 비율이 다르면 남는 영역은 레터박스로 처리된다.
 * (참고: 갤럭시 Z 폴드5 커버 디스플레이 가로 ≈ 2316×904 ≈ 23:9,
 *        메인 디스플레이 가로 ≈ 2176×1812 ≈ 6:5)
 */
export const STAGE_WIDTH = 1280;
export const STAGE_HEIGHT = 720;
