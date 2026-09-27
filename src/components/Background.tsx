import { useState } from 'react';
import { MAT_QUAD } from '../config/layout';

const BG_URL = `${import.meta.env.BASE_URL}assets/bg_livingroom.webp`;

const matPolygon = MAT_QUAD.map((p) => `${p.x}px ${p.y}px`).join(', ');

/**
 * 거실 배경 (캐릭터·모포 포함 일러스트).
 * 이미지가 없으면 벽/바닥 그라데이션 + 모포 사다리꼴로 대체해 레이아웃 좌표가 그대로 유효하게 한다.
 */
export function Background() {
  const [failed, setFailed] = useState(false);

  if (!failed) {
    return (
      <img
        src={BG_URL}
        alt=""
        draggable={false}
        className="absolute inset-0 h-full w-full"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-gradient-to-b from-[#f3e3c4] to-[#e9cfa2]" />
      <div className="absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-b from-[#f0d6ad] to-[#e2bb86]" />
      <div className="absolute inset-0 bg-[#6f7a4c]" style={{ clipPath: `polygon(${matPolygon})` }} />
    </div>
  );
}
