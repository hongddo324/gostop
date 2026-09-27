"""
앱 아이콘 생성: 초록 모포 위에 광 3장(1월 송학·3월 사쿠라·8월 공산)을 부채꼴로 펼치고 아래에 '월곡'.

출력:
  assets-src/icon-1024.png                            마스터 (스토어/미리보기용)
  android/.../mipmap-*/ic_launcher.png, _round.png    구형 런처 아이콘 (48~192px)
  android/.../mipmap-*/ic_launcher_foreground.png     적응형 아이콘 전경 (108dp, 안전 영역 66dp 안에 그림)
  android/.../values/ic_launcher_background.xml       적응형 아이콘 배경색
  public/favicon.png                                  웹 파비콘
  android/.../drawable*/splash.png                    앱 시작 스플래시 (모포 + 카드 + '월곡')

사용: python3 scripts/make_icon.py   (pip install pillow)
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
CARDS = ROOT / "public" / "assets" / "cards"
RES = ROOT / "android" / "app" / "src" / "main" / "res"
FONT = "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"

FELT = (46, 110, 64)
FELT_DARK = (24, 70, 38)
DENSITIES = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}


def felt(size: int) -> Image.Image:
    """모포 배경: 가운데가 밝은 방사형 그라데이션"""
    bg = Image.new("RGB", (size, size), FELT_DARK)
    glow = Image.new("L", (size, size), 0)
    ImageDraw.Draw(glow).ellipse((-size * 0.2, -size * 0.25, size * 1.2, size * 1.1), fill=255)
    glow = glow.filter(ImageFilter.GaussianBlur(size * 0.18))
    bg.paste(Image.new("RGB", (size, size), FELT), (0, 0), glow)
    return bg


def card(cid: str, h: int) -> Image.Image:
    img = Image.open(CARDS / f"{cid}.webp").convert("RGBA")
    w = round(h * img.width / img.height)
    img = img.resize((w, h), Image.LANCZOS)
    # 둥근 모서리 + 흰 테두리
    r = max(4, h // 18)
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, w - 1, h - 1), r, fill=255)
    out = Image.new("RGBA", (w + 8, h + 8), (0, 0, 0, 0))
    border = Image.new("RGBA", (w + 8, h + 8), (0, 0, 0, 0))
    ImageDraw.Draw(border).rounded_rectangle((0, 0, w + 7, h + 7), r + 4, fill=(255, 250, 235, 255))
    out.alpha_composite(border)
    img.putalpha(mask)
    out.alpha_composite(img, (4, 4))
    return out


def artwork(size: int) -> Image.Image:
    """투명 배경 위 카드 3장 + 글자 (size 정사각 안에 꽉 차게)"""
    art = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ch = int(size * 0.56)
    fan = [("01-gwang", -18, -0.20), ("08-gwang", 18, 0.20), ("03-gwang", 0, 0.0)]  # 가운데(사쿠라)가 맨 위
    for cid, angle, dx in fan:
        c = card(cid, ch).rotate(angle, resample=Image.BICUBIC, expand=True)
        shadow = Image.new("RGBA", c.size, (0, 0, 0, 0))
        shadow.putalpha(c.getchannel("A").point(lambda a: a * 0.45))
        shadow = shadow.filter(ImageFilter.GaussianBlur(size * 0.012))
        x = int(size / 2 - c.width / 2 + dx * size)
        y = int(size * 0.40 - c.height / 2)
        art.alpha_composite(shadow, (x + size // 80, y + size // 50))
        art.alpha_composite(c, (x, y))
    # 글자
    d = ImageDraw.Draw(art)
    font = ImageFont.truetype(FONT, int(size * 0.20))
    text = "월곡"
    tw = d.textbbox((0, 0), text, font=font)
    x = (size - (tw[2] - tw[0])) / 2 - tw[0]
    y = size * 0.72
    stroke = max(2, size // 70)
    d.text((x + size // 90, y + size // 90), text, font=font, fill=(90, 40, 10, 200), stroke_width=stroke, stroke_fill=(90, 40, 10, 200))
    d.text((x, y), text, font=font, fill=(255, 214, 90, 255), stroke_width=stroke, stroke_fill=(120, 55, 15, 255))
    return art


def rounded(img: Image.Image, radius_ratio: float) -> Image.Image:
    s = img.width
    mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, s - 1, s - 1), int(s * radius_ratio), fill=255)
    out = img.convert("RGBA")
    out.putalpha(mask)
    return out


def circle(img: Image.Image) -> Image.Image:
    s = img.width
    mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, s - 1, s - 1), fill=255)
    out = img.convert("RGBA")
    out.putalpha(mask)
    return out


def main():
    master = felt(1024).convert("RGBA")
    master.alpha_composite(artwork(1024))
    (ROOT / "assets-src").mkdir(exist_ok=True)
    rounded(master, 0.18).save(ROOT / "assets-src" / "icon-1024.png")
    master.resize((64, 64), Image.LANCZOS).save(ROOT / "public" / "favicon.png")

    # 적응형 전경: 108dp 캔버스의 가운데 66dp(약 61%) 안에 그림
    fg_master = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    inner = int(1024 * 66 / 108)
    fg_master.alpha_composite(artwork(inner).resize((inner, inner), Image.LANCZOS), ((1024 - inner) // 2,) * 2)

    for name, k in DENSITIES.items():
        d = RES / f"mipmap-{name}"
        d.mkdir(parents=True, exist_ok=True)
        legacy = round(48 * k)
        master_small = master.resize((legacy, legacy), Image.LANCZOS)
        rounded(master_small, 0.18).save(d / "ic_launcher.png")
        circle(master_small).save(d / "ic_launcher_round.png")
        fg = round(108 * k)
        fg_master.resize((fg, fg), Image.LANCZOS).save(d / "ic_launcher_foreground.png")

    (RES / "values").mkdir(exist_ok=True)
    (RES / "values" / "ic_launcher_background.xml").write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
        f'    <color name="ic_launcher_background">#{FELT[0]:02X}{FELT[1]:02X}{FELT[2]:02X}</color>\n</resources>\n',
        encoding="utf-8",
    )
    # 스플래시(앱 켤 때 잠깐 보이는 화면): 기존 splash.png 크기 그대로 모포 + 가운데 아트
    for sp in RES.glob("drawable*/splash.png"):
        w, h = Image.open(sp).size
        bg = felt(max(w, h)).resize((max(w, h), max(w, h))).crop(((max(w, h) - w) // 2, (max(w, h) - h) // 2, (max(w, h) - w) // 2 + w, (max(w, h) - h) // 2 + h)).convert("RGBA")
        a = int(min(w, h) * 0.55)
        bg.alpha_composite(artwork(a), ((w - a) // 2, (h - a) // 2))
        bg.convert("RGB").save(sp)
    print("icons + splash written")


if __name__ == "__main__":
    main()
