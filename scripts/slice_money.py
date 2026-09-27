"""
지폐 참고 시트(assets-src/money_sheet.png, 세로 4장: 천원/오천원/만원/오만원)를
public/assets/money/{1000,5000,10000,50000}.webp 로 자른다.

사용: python3 scripts/slice_money.py   (pip install pillow)
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets-src" / "money_sheet.png"
OUT = ROOT / "public" / "assets" / "money"

# (값, 위, 아래) — 가로는 공통 17~359, 테두리 1px 안쪽으로 자름
BILLS = [(1000, 20, 162), (5000, 178, 319), (10000, 335, 476), (50000, 493, 635)]
X0, X1 = 18, 358

img = Image.open(SRC).convert("RGB")
OUT.mkdir(parents=True, exist_ok=True)
for value, y0, y1 in BILLS:
    img.crop((X0, y0 + 1, X1, y1 - 1)).save(OUT / f"{value}.webp", quality=90, method=6)
    print(value, "ok")
