import { useEffect, useState } from 'react';

/** 뷰포트 안에 (width × height) 스테이지가 비율을 유지하며 들어가는 최대 배율 */
export function useStageScale(width: number, height: number): number {
  const compute = () => {
    const vw = window.visualViewport?.width ?? window.innerWidth;
    const vh = window.visualViewport?.height ?? window.innerHeight;
    return Math.min(vw / width, vh / height);
  };

  const [scale, setScale] = useState(compute);

  useEffect(() => {
    const onResize = () => setScale(compute());
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  return scale;
}
