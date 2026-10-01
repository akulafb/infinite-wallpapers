#!/usr/bin/env python3
"""Generate the Google Play feature graphic (1024x500, RGB, no alpha).

Run from anywhere:  python3 android/play/make_feature_graphic.py
Output:             android/play/feature-graphic.png
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
SHOTS = HERE / "screenshots"
ICON = REPO / "build" / "icon-1024.jpg"
OUT = HERE / "feature-graphic.png"

W, H = 1024, 500
S = 2  # supersample factor for smooth edges
BG = (20, 33, 52)  # #142134, the icon background

TITLE_FONTS = [
    "/System/Library/Fonts/SFNSRounded.ttf",
    "/System/Library/Fonts/SFNS.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
]
BODY_FONTS = [
    "/System/Library/Fonts/SFNS.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
]


def font(paths, size, weight=None):
    for p in paths:
        if Path(p).exists():
            f = ImageFont.truetype(p, size)
            if weight:
                try:
                    f.set_variation_by_name(weight)
                except Exception:
                    pass
            return f
    return ImageFont.load_default()


def rounded_mask(size, radius):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius, fill=255)
    return m


def background():
    """Navy base with a soft diagonal gradient and two faint colour glows."""
    w, h = W * S, H * S
    base = Image.new("RGB", (w, h), BG)
    # vertical/diagonal gradient: slightly lighter top-left, darker bottom-right
    v = Image.linear_gradient("L").resize((w, h))
    hz = Image.linear_gradient("L").rotate(90).transpose(Image.FLIP_LEFT_RIGHT).resize((w, h))
    grad = Image.blend(v, hz, 0.5)
    dark = Image.new("RGB", (w, h), (11, 19, 33))
    light = Image.new("RGB", (w, h), (30, 46, 72))
    base = Image.composite(dark, light, grad)

    glow = Image.new("RGB", (w, h), (0, 0, 0))
    g = ImageDraw.Draw(glow)
    # aurora-green/teal glow behind the phones, violet glow top-left
    g.ellipse([w * 0.55, h * 0.05, w * 1.05, h * 1.05], fill=(40, 120, 120))
    g.ellipse([-w * 0.15, -h * 0.6, w * 0.45, h * 0.55], fill=(80, 60, 140))
    glow = glow.filter(ImageFilter.GaussianBlur(120 * S))
    from PIL import ImageChops
    base = ImageChops.add(base, glow.point(lambda v: int(v * 0.45)))
    return base


def phone_card(src, crop_box, width, radius, bezel):
    """Screenshot crop inside a plain dark rounded card (generic, no device shape)."""
    im = Image.open(src).convert("RGB").crop(crop_box)
    inner_w = width - 2 * bezel
    inner_h = round(im.height * inner_w / im.width)
    im = im.resize((inner_w, inner_h), Image.LANCZOS)
    card = Image.new("RGBA", (width, inner_h + 2 * bezel), (0, 0, 0, 0))
    ImageDraw.Draw(card).rounded_rectangle(
        [0, 0, card.width - 1, card.height - 1], radius, fill=(12, 16, 24, 255),
        outline=(70, 84, 110, 255), width=max(1, S))
    card.paste(im, (bezel, bezel), rounded_mask(im.size, radius - bezel))
    return card


def place(canvas, card, center, angle, shadow=True):
    rot = card.rotate(angle, resample=Image.BICUBIC, expand=True)
    x = round(center[0] - rot.width / 2)
    y = round(center[1] - rot.height / 2)
    if shadow:
        pad = 60 * S
        sh = Image.new("RGBA", (rot.width + 2 * pad, rot.height + 2 * pad), (0, 0, 0, 0))
        a = Image.new("L", sh.size, 0)
        a.paste(rot.getchannel("A").point(lambda v: int(v * 0.55)), (pad, pad))
        sh.putalpha(a.filter(ImageFilter.GaussianBlur(16 * S)))
        canvas.alpha_composite(sh, (x - pad + 10 * S, y - pad + 18 * S))
    canvas.alpha_composite(rot, (x, y))


def main():
    canvas = background().convert("RGBA")
    d = ImageDraw.Draw(canvas)

    # ---- phones (right side) ----
    # Themes grid: start at the "Theme" header (skips status bar + API-key card).
    themes = phone_card(SHOTS / "2-themes.png", (0, 520, 1080, 2160),
                        width=228 * S, radius=24 * S, bezel=7 * S)
    # Lock screen: drop the status bar (carrier name) and keep clock + road.
    lock = phone_card(SHOTS / "5-lock-screen.png", (0, 150, 1080, 2160),
                      width=206 * S, radius=26 * S, bezel=7 * S)
    place(canvas, themes, (858 * S, 256 * S), -7)
    place(canvas, lock, (690 * S, 252 * S), 5)

    # ---- icon + text (left side) ----
    icon_size = 112 * S
    icon = Image.open(ICON).convert("RGB").resize((icon_size, icon_size), Image.LANCZOS)
    ix, iy = 72 * S, 92 * S
    pad = 40 * S
    ish = Image.new("RGBA", (icon_size + 2 * pad, icon_size + 2 * pad), (0, 0, 0, 0))
    a = Image.new("L", ish.size, 0)
    a.paste(rounded_mask((icon_size, icon_size), 26 * S).point(lambda v: int(v * 0.5)), (pad, pad))
    ish.putalpha(a.filter(ImageFilter.GaussianBlur(10 * S)))
    canvas.alpha_composite(ish, (ix - pad + 3 * S, iy - pad + 8 * S))
    canvas.paste(icon, (ix, iy), rounded_mask(icon.size, 26 * S))
    d.rounded_rectangle([ix, iy, ix + icon_size - 1, iy + icon_size - 1], 26 * S,
                        outline=(255, 255, 255, 40), width=S)

    title_f = font(TITLE_FONTS, 50 * S, b"Bold")
    tag_f = font(BODY_FONTS, 22 * S, b"Regular")
    tx = ix
    ty = iy + icon_size + 26 * S
    d.text((tx, ty), "Infinite", font=title_f, fill=(255, 255, 255))
    ty += 56 * S
    d.text((tx, ty), "Wallpapers", font=title_f, fill=(255, 255, 255))
    ty += 72 * S
    d.text((tx, ty), "A fresh wallpaper, found for you.", font=tag_f,
           fill=(182, 198, 224))

    out = canvas.convert("RGB").resize((W, H), Image.LANCZOS)
    out.save(OUT, "PNG", optimize=True)
    print(f"wrote {OUT} ({out.size[0]}x{out.size[1]}, mode {out.mode})")


if __name__ == "__main__":
    main()
