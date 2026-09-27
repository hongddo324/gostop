"""
캐릭터 모션 시트를 프레임별 투명 WebP 로 분리하고 정렬한다.

입력 (투명 배경 RGBA):
  assets-src/motion_{seatId}.webp   화투 치는 모션 8프레임 (2행 × 4열, 행 우선)
      1 대기 → 2 패 고르기 → 3 들어 올리기 → 4 높이 들기 → 5 내려치기 → 6 바닥에 탁 → 7 돌아오기 → 8 대기
  assets-src/characters_cheer.webp  득점 기쁨 3프레임 (3행 × 3열) — 행: 외할머니 / 이모부님(가운데) / 장인어른(오른쪽)
  assets-src/sad_{seatId}.webp      남이 점수 가져갈 때 아쉬워하는 8프레임 (2행 × 4열, 행 우선)

출력:
  public/assets/characters/{seatId}/{play-1..8,cheer-1..3,sad-1..8}.webp
  src/config/characterFrames.json   캐릭터별 캔버스 크기와 기준점(대기 프레임의 다리 하단 중앙)

정렬 방식:
  내려치는 프레임은 손이 다리보다 아래로 내려가므로 '맨 아래 픽셀' 기준 정렬은 위아래로 튄다.
  대신 기준 프레임(대기)의 다리 영역 마스크와 각 프레임 마스크의 상호상관(FFT) 최대점으로
  이동량을 구해, 앉은 다리가 모든 프레임에서 같은 자리에 오도록 맞춘다.
  기쁨 시트는 인물 크기가 달라 먼저 다리 폭 비율로 리샘플링한다.

사용: python3 scripts/slice_characters.py   (pip install pillow numpy scipy)
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from scipy.signal import fftconvolve

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets-src"
OUT = ROOT / "public" / "assets" / "characters"
META = ROOT / "src" / "config" / "characterFrames.json"

SEATS = ["grandma", "uncle", "father-in-law"]
CHEER_ROW = {"grandma": 0, "uncle": 1, "father-in-law": 2}

ALPHA_MIN = 16
LEG_BAND = (0.72, 0.92)  # 기준 프레임 높이 대비 다리 영역 (손이 내려오는 맨 아래는 제외)
PAD = 4


def extract(path: Path, rows: int, cols: int):
    """시트에서 rows×cols 프레임을 행 우선 리스트(RGBA ndarray)로 반환"""
    rgba = np.asarray(Image.open(path).convert("RGBA"))
    mask = rgba[:, :, 3] > ALPHA_MIN
    lab, _ = ndi.label(mask)
    h, w = mask.shape
    cells: dict[tuple[int, int], list[int]] = {}
    for i, sl in enumerate(ndi.find_objects(lab), start=1):
        if sl is None:
            continue
        cy = (sl[0].start + sl[0].stop) / 2
        cx = (sl[1].start + sl[1].stop) / 2
        cells.setdefault((int(cy // (h / rows)), int(cx // (w / cols))), []).append(i)
    frames = []
    for r in range(rows):
        for c in range(cols):
            m = np.isin(lab, cells[(r, c)])
            ys, xs = np.where(m)
            y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
            crop = rgba[y0:y1, x0:x1].copy()
            crop[~m[y0:y1, x0:x1]] = 0
            frames.append(crop)
    return frames


def leg_width(frame) -> float:
    m = frame[:, :, 3] > ALPHA_MIN
    h = m.shape[0]
    band = m[int(h * LEG_BAND[0]) : int(h * LEG_BAND[1])]
    xs = np.where(band.any(axis=0))[0]
    return float(xs.max() - xs.min() + 1)


def resize(frame, k: float):
    if abs(k - 1) < 1e-3:
        return frame
    img = Image.fromarray(frame)
    return np.asarray(img.resize((max(1, round(img.width * k)), max(1, round(img.height * k))), Image.LANCZOS))


def band_center(frame) -> float:
    m = frame[:, :, 3] > ALPHA_MIN
    h = m.shape[0]
    xs = np.where(m[int(h * LEG_BAND[0]) : int(h * LEG_BAND[1])].any(axis=0))[0]
    return (xs.min() + xs.max()) / 2


SEARCH = 60  # 초기 추정값 주변 탐색 반경(px) — 팔 등 다른 부위와 잘못 맞춰지는 것 방지


def align_offset(ref, frame) -> tuple[int, int]:
    """frame 을 ref 좌표계에 놓을 때의 (dx, dy) — 다리 영역 상호상관 최대점"""
    def legs_mask(f, lo=LEG_BAND[0], hi=1.0):
        m = (f[:, :, 3] > ALPHA_MIN).astype(np.float32)
        out = np.zeros_like(m)
        h = m.shape[0]
        out[int(h * lo) : int(h * hi)] = m[int(h * lo) : int(h * hi)]
        return out

    ref_legs = legs_mask(ref, LEG_BAND[0], LEG_BAND[1])
    fm = legs_mask(frame, 0.5)
    # corr[y, x] = sum(ref_legs[i, j] * fm[i - dy, j - dx])
    corr = fftconvolve(ref_legs, fm[::-1, ::-1], mode="full")
    oy, ox = fm.shape[0] - 1, fm.shape[1] - 1

    # 초기 추정: 바닥 맞춤 + 다리 중심 맞춤, 그 주변에서만 최대점 탐색
    gx = int(round(band_center(ref) - band_center(frame)))
    gy = ref.shape[0] - frame.shape[0]
    y_lo, y_hi = max(0, gy + oy - SEARCH), min(corr.shape[0], gy + oy + SEARCH + 1)
    x_lo, x_hi = max(0, gx + ox - SEARCH), min(corr.shape[1], gx + ox + SEARCH + 1)
    win = corr[y_lo:y_hi, x_lo:x_hi]
    py, px = np.unravel_index(np.argmax(win), win.shape)
    return int(px + x_lo - ox), int(py + y_lo - oy)


def main():
    cheer_sheet = extract(SRC / "characters_cheer.webp", 3, 3)
    meta = {}
    for seat in SEATS:
        play = extract(SRC / f"motion_{seat}.webp", 2, 4)
        ref = play[0]
        cheer = cheer_sheet[CHEER_ROW[seat] * 3 : CHEER_ROW[seat] * 3 + 3]
        k = leg_width(ref) / float(np.median([leg_width(f) for f in cheer]))
        cheer = [resize(f, k) for f in cheer]
        sad = extract(SRC / f"sad_{seat}.webp", 2, 4)
        ks = leg_width(ref) / float(np.median([leg_width(f) for f in sad]))
        sad = [resize(f, ks) for f in sad]
        print(f"{seat}: cheer scale {k:.3f}, sad scale {ks:.3f}")

        named = (
            [(f"play-{i + 1}", f) for i, f in enumerate(play)]
            + [(f"cheer-{i + 1}", f) for i, f in enumerate(cheer)]
            + [(f"sad-{i + 1}", f) for i, f in enumerate(sad)]
        )
        placed = [(name, f, *align_offset(ref, f)) for name, f in named]

        x0 = min(dx for _, _, dx, _ in placed) - PAD
        y0 = min(dy for _, _, _, dy in placed) - PAD
        x1 = max(dx + f.shape[1] for _, f, dx, _ in placed) + PAD
        y1 = max(dy + f.shape[0] for _, f, _, dy in placed) + PAD
        cw, ch = x1 - x0, y1 - y0

        # 기준점: 대기 프레임 다리 영역 가로 중심, 대기 프레임 맨 아래
        rm = ref[:, :, 3] > ALPHA_MIN
        band = rm[int(ref.shape[0] * LEG_BAND[0]) : int(ref.shape[0] * LEG_BAND[1])]
        bx = np.where(band.any(axis=0))[0]
        anchor = (int(round((bx.min() + bx.max()) / 2)) - x0, ref.shape[0] - y0)

        (OUT / seat).mkdir(parents=True, exist_ok=True)
        for name, f, dx, dy in placed:
            canvas = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
            canvas.alpha_composite(Image.fromarray(f), (dx - x0, dy - y0))
            canvas.save(OUT / seat / f"{name}.webp", quality=86, method=6)
        meta[seat] = {"width": cw, "height": ch, "anchorX": anchor[0], "anchorY": anchor[1], "bodyHeight": int(ref.shape[0])}
        print(seat, meta[seat], "offsets", [(n, dx, dy) for n, _, dx, dy in placed])

    META.write_text(json.dumps(meta, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
