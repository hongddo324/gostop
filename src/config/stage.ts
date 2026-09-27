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

/**
 * 화면 구성: 위 = 게임 장면(배경·모포·캐릭터), 아래 = 내 손패 전용 패널.
 * 장면은 배경(1280×720 좌표계)을 SCENE_SHIFT 만큼 위로 올려 그리므로
 * 배경의 블라인드 부분만 잘리고 넓어진 모포는 패널 바로 위까지 전부 보인다.
 */
export const HAND_PANEL_H = 112;
export const SCENE_SHIFT = HAND_PANEL_H;
