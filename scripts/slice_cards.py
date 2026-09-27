"""
화투 스프라이트 시트(assets-src/hwatu_sprite.jpg)를 카드 48장으로 잘라
public/assets/cards/{cardId}.webp 로 저장한다.

시트 구성: 8열 × 6행, 카드 48×72px, 간격 8px, 좌상단 여백 4px.
셀 순서(행 우선)는 src/game/cards.ts 의 createDeck() 순서와 동일하다.
  - 1행: 1월(광·홍단·피·피) 2월(고도리·홍단·피·피)
  - ...
  - 6행: 11월 오동(광·쌍피·피·피) 12월 비(광·열끗·띠·쌍피)

사용: python3 scripts/slice_cards.py   (pip install pillow)
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets-src" / "hwatu_sprite.jpg"
OUT = ROOT / "public" / "assets" / "cards"

COLS, ROWS = 8, 6
ORIGIN, CARD_W, CARD_H, PITCH_X, PITCH_Y = 4, 48, 72, 56, 80
UPSCALE = 3  # 원본이 작아 확대 시 계단 현상을 줄이기 위해 미리 리샘플링

# createDeck() 과 동일한 월별 종류 순서
SPEC = {
    1: ["gwang", "tti", "pi", "pi"],
    2: ["yeol", "tti", "pi", "pi"],
    3: ["gwang", "tti", "pi", "pi"],
    4: ["yeol", "tti", "pi", "pi"],
    5: ["yeol", "tti", "pi", "pi"],
    6: ["yeol", "tti", "pi", "pi"],
    7: ["yeol", "tti", "pi", "pi"],
    8: ["gwang", "yeol", "pi", "pi"],
    9: ["yeol", "tti", "pi", "pi"],
    10: ["yeol", "tti", "pi", "pi"],
    11: ["gwang", "pi", "pi", "pi"],
    12: ["gwang", "yeol", "tti", "pi"],
}


def card_ids():
    for month, types in SPEC.items():
        pi = 0
        for t in types:
            if t == "pi":
                pi += 1
                yield f"{month:02d}-pi-{pi}"
            else:
                yield f"{month:02d}-{t}"


def main():
    sheet = Image.open(SRC).convert("RGB")
    OUT.mkdir(parents=True, exist_ok=True)
    for i, cid in enumerate(card_ids()):
        c, r = i % COLS, i // COLS
        x, y = ORIGIN + c * PITCH_X, ORIGIN + r * PITCH_Y
        card = sheet.crop((x, y, x + CARD_W, y + CARD_H))
        card = card.resize((CARD_W * UPSCALE, CARD_H * UPSCALE), Image.LANCZOS)
        card.save(OUT / f"{cid}.webp", quality=90, method=6)
    print(f"{i + 1} cards -> {OUT}")


if __name__ == "__main__":
    main()
