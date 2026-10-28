#!/usr/bin/env python3
"""Builds docs/social-preview.png (1280x640) from the text-free art + real fonts. Needs Pillow with raqm,
the source art (src-art/hero_a.jpg, src-art/bamboo_a.jpg) and nofap-plan/tools/build_art.py on the path."""
import sys, os
from PIL import Image, ImageEnhance, ImageDraw, ImageFont
sys.path.insert(0, os.environ.get("ART_TOOLS", "/workspace/nofap-plan/tools"))
import build_art as BA
BA.SRC = os.environ.get("ART_SRC", "/workspace/nofap-plan/src-art")
W, H = 1280, 640
def ltr_mask(text, f, pad):
    l, t, r, b = ImageDraw.Draw(Image.new("L", (1, 1))).textbbox((0, 0), text, font=f)
    m = Image.new("L", (r - l + 2 * pad, b - t + 2 * pad), 0); ImageDraw.Draw(m).text((pad - l, pad - t), text, font=f, fill=255); return m
def ember_ltr(text, f, **kw):
    orig = BA.text_mask; BA.text_mask = ltr_mask
    try: return BA.ember_text(text, f, **kw)
    finally: BA.text_mask = orig
bg = ImageEnhance.Brightness(Image.open(BA.SRC + "/hero_a.jpg").convert("RGB")).enhance(1.06)
bg = bg.resize((1280, 720), Image.LANCZOS).crop((0, 30, 1280, 670)).convert("RGBA")
pw, ph = 940, 400
pl, inner = BA.bamboo_plaque(pw, ph, s=0.6)
sh, pad = BA.drop_shadow(pl, off=(0, 10), blur=14, opacity=.55)
px, py = (W - pw) // 2, 78
bg.alpha_composite(sh, (px - pad, py - pad))
ix0, iy0, ix1, iy1 = inner[0] + px, inner[1] + py, inner[2] + px, inner[3] + py
cx = (ix0 + ix1) / 2
bg.alpha_composite(BA.radial_glow(bg.size, cx, iy0 + 90, 340, 100, (255, 120, 20), .5))
t, _ = BA.ember_text("שמירת הברית", BA.font(BA.FRANK, 100, 900), bloom=30); BA.paste_center(bg, t, cx, iy0 + 66)
cz = ImageFont.truetype("/usr/share/fonts/truetype/sand-box/google/Cinzel/Cinzel-VariableFont_wght.ttf", 44); cz.set_variation_by_axes([800])
e, _ = ember_ltr("GUARDING THE COVENANT", cz, stops=BA.GOLD, glow=.7, outline=2, bloom=14); BA.paste_center(bg, e, cx, iy0 + 158)
s, _ = BA.ember_text("להיות אדון לעצמך", BA.font(BA.SECULAR, 34), stops=BA.GOLD, glow=.5, outline=2, bloom=10); BA.paste_center(bg, s, cx, iy0 + 214)
strip = Image.new("RGBA", (W, 96), (255, 250, 238, 222)); bg.alpha_composite(strip, (0, H - 96))
tg, _ = BA.ember_text("תוכנית ואפליקציה פרטית · עובדת אופליין · הנתונים נשארים במכשיר", BA.font(BA.SECULAR, 30),
                      stops=[(0, (14, 124, 123)), (1, (10, 89, 88))], glow=0, outline=0, bloom=2)
BA.paste_center(bg, tg, W / 2, H - 64)
hb = ImageFont.truetype("/usr/share/fonts/truetype/sand-box/google/Heebo/Heebo-VariableFont_wght.ttf", 24); hb.set_variation_by_axes([600])
en, _ = ember_ltr("A private, offline self-mastery plan & app · your data stays on your device", hb,
                  stops=[(0, (90, 70, 40)), (1, (90, 70, 40))], glow=0, outline=0, bloom=2)
BA.paste_center(bg, en, W / 2, H - 27)
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "docs", "social-preview.png")
bg.convert("RGB").quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG).save(out, optimize=True)
print(os.path.getsize(out) // 1024, "KB")
