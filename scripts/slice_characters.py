"""
캐릭터 모션 시트를 프레임별 투명 WebP 로 분리한다.

입력 (투명 배경 RGBA, 3행 × 3열):
  assets-src/characters_play.webp   화투 치는 모션: [패 들고 대기, 패 내기, 패 들고 대기2]
  assets-src/characters_cheer.webp  득점 시 좋아하는 모션: 3프레임 루프
  행 순서: 외할머니 / 장인어른(가운데) / 이모부님(오른쪽)

출력:
  public/assets/characters/{seatId}/{play-1..3,cheer-1..3}.webp
  src/config/characterFrames.json   캐릭터별 캔버스 크기와 기준점(앉은 자리 하단 중앙)

한 캐릭터의 6프레임은 모두 같은 캔버스 크기 + 같은 기준점으로 정규화하므로
프레임 전환 시 몸 위치가 튀지 않는다.

사용: python3 scripts/slice_characters.py   (pip install pillow numpy scipy)
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parent.parent
SHEETS = {
    "play": ROOT / "assets-src" / "characters_play.webp",
    "cheer": ROOT / "assets-src" / "characters_cheer.webp",
}
ROW_IDS = ["grandma", "father-in-law", "uncle"]
OUT = ROOT / "public" / "assets" / "characters"
META = ROOT / "src" / "config" / "characterFrames.json"

ALPHA_MIN = 16
LEG_BAND = 0.15  # 하단 15% (다리/엉덩이) 영역의 중심을 가로 기준점으로 사용
PAD = 4


def extract_frames(path: Path):
    """시트에서 3×3 프레임을 (row, col) -> RGBA crop, bbox 로 반환"""
    img = Image.open(path).convert("RGBA")
    rgba = np.asarray(img)
    mask = rgba[:, :, 3] > ALPHA_MIN
    lab, n = ndi.label(mask)
    objs = ndi.find_objects(lab)
    h, w = mask.shape

    # 각 연결 요소를 중심 좌표로 3×3 셀에 배정 (팔/던지는 카드처럼 떨어진 조각도 같은 셀로 묶임)
    cells: dict[tuple[int, int], list[int]] = {}
    for i, sl in enumerate(objs, start=1):
        if sl is None:
            continue
        cy = (sl[0].start + sl[0].stop) / 2
        cx = (sl[1].start + sl[1].stop) / 2
        cells.setdefault((int(cy // (h / 3)), int(cx // (w / 3))), []).append(i)

    frames = {}
    for (r, c), ids in cells.items():
        m = np.isin(lab, ids)
        ys, xs = np.where(m)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        crop = rgba[y0:y1, x0:x1].copy()
        crop[~m[y0:y1, x0:x1]] = 0  # 이웃 셀 침범분 제거
        sub = m[y0:y1, x0:x1]
        band = sub[int((y1 - y0) * (1 - LEG_BAND)) :]
        bx = np.where(band.any(axis=0))[0]
        anchor_x = (bx.min() + bx.max()) / 2  # 다리 영역 가로 중심
        anchor_y = y1 - y0  # 맨 아래
        frames[(r, c)] = (crop, anchor_x, anchor_y)
    return frames


def main():
    all_frames = {k: extract_frames(p) for k, p in SHEETS.items()}
    meta = {}
    for r, seat in enumerate(ROW_IDS):
        items = []
        for kind in ("play", "cheer"):
            for c in range(3):
                items.append((f"{kind}-{c + 1}", *all_frames[kind][(r, c)]))

        left = max(ax for _, _, ax, _ in items)
        right = max(crop.shape[1] - ax for _, crop, ax, _ in items)
        top = max(ay for _, _, _, ay in items)
        cw, ch = int(np.ceil(left + right)) + PAD * 2, int(top) + PAD
        anchor = (int(round(left)) + PAD, int(top))

        (OUT / seat).mkdir(parents=True, exist_ok=True)
        for name, crop, ax, ay in items:
            canvas = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
            canvas.alpha_composite(Image.fromarray(crop), (int(round(anchor[0] - ax)), int(anchor[1] - ay)))
            canvas.save(OUT / seat / f"{name}.webp", quality=88, method=6)

        # 대기 프레임 기준 인물 키 (배치 시 표시 높이 → 배율 계산용)
        body_h = int(items[0][3])
        meta[seat] = {"width": cw, "height": ch, "anchorX": anchor[0], "anchorY": anchor[1], "bodyHeight": body_h}
        print(seat, meta[seat])

    META.write_text(json.dumps(meta, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
