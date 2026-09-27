import { useState } from 'react';

const BG_URL = `${import.meta.env.BASE_URL}assets/bg_livingroom.png`;

/** 거실 배경. 이미지가 없으면 따뜻한 톤의 그라데이션으로 대체한다. */
export function Background() {
  const [failed, setFailed] = useState(false);

  return (
    <div className="absolute inset-0">
      {/* fallback: 벽(상단) + 장판 바닥(하단) */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#e9d8b8] via-[#d9bf92] to-[#b98a4e]" />
      <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-b from-[#c99b5a] to-[#9c6b33]" />
      {!failed && (
        <img
          src={BG_URL}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
