import type { ReactNode } from 'react';
import { STAGE_HEIGHT, STAGE_WIDTH } from '../config/stage';
import { useStageScale } from '../hooks/useStageScale';

/**
 * 고정 논리 해상도 스테이지를 화면 중앙에 두고 비율 유지 스케일링.
 * 자식은 STAGE_WIDTH × STAGE_HEIGHT 좌표계 기준으로 absolute 배치하면 된다.
 */
export function StageContainer({ children }: { children: ReactNode }) {
  const scale = useStageScale(STAGE_WIDTH, STAGE_HEIGHT);

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-wood">
      <div style={{ width: STAGE_WIDTH * scale, height: STAGE_HEIGHT * scale }} className="relative">
        <div
          className="absolute left-0 top-0 origin-top-left overflow-hidden"
          style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT, transform: `scale(${scale})` }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
