#!/usr/bin/env python3
"""Renders the 1200x630 share cards (Open Graph / Twitter) for every route.

Reads `scripts/og-data.json` (written by scripts/gen-meta.mjs) and writes
`public/og/<key>.png`. Committed to the repo because Cloudflare Pages builds
only run Node — the cards change when the tool list or the blog changes, not on
every deploy.

    python3 scripts/gen_og.py

Design matches the site: white ground, Source Sans 3, brand blue #0055FF, a
tile logo mark, and a paper-stack motif on the right.
"""
import json
import math
import pathlib

from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "og"
FONT_PATH = pathlib.Path("/root/fonts/SS3.ttf")

W, H = 1200, 630
BRAND = "#0055FF"
INK = "#1A1A1A"
SOFT = "#3A3A3A"
MUTED = "#6B6B6B"
LINE = "#E8E8EC"
TILES = ["#FF5400", "#FFD200", "#00D267", "#0055FF"]
MARGIN = 72

SS = 4  # supersampling for rotated shapes


def font(size: int, weight: int) -> ImageFont.FreeTypeFont:
    f = ImageFont.truetype(str(FONT_PATH), size)
    f.set_variation_by_axes([weight])
    return f


def hex_rgb(h, alpha=255):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), alpha)


def tint(h, amount):
    """Blend a colour towards white. amount=1 -> white."""
    r, g, b, _ = hex_rgb(h)
    mix = lambda c: int(c + (255 - c) * amount)
    return (mix(r), mix(g), mix(b), 255)


def wrap(draw, text, f, max_w):
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if draw.textlength(trial, font=f) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def rotated_card(w, h, radius, fill, outline=None, angle=0.0):
    """A rounded rectangle rendered supersampled and rotated, on transparency."""
    pad = int(max(w, h) * 0.35)
    cw, ch = (w + pad * 2) * SS, (h + pad * 2) * SS
    tile = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    d = ImageDraw.Draw(tile)
    d.rounded_rectangle(
        [pad * SS, pad * SS, (pad + w) * SS, (pad + h) * SS],
        radius=radius * SS,
        fill=fill,
        outline=outline,
        width=SS * 2 if outline else 0,
    )
    if angle:
        tile = tile.rotate(angle, resample=Image.BICUBIC, expand=True)
    sm = tile.resize((tile.width // SS, tile.height // SS), Image.LANCZOS)
    return sm


def paper_stack(img, accent, cx=905, cy=320, mirror=1):
    """The right-hand motif: three offset sheets with a mini document on top."""
    base_w, base_h = 300, 380
    layers = [
        (base_w, base_h, 14, tint(accent, 0.80), None, 9),
        (base_w, base_h, 14, tint(accent, 0.90), None, -5),
        (base_w, base_h, 14, (255, 255, 255, 255), hex_rgb(LINE), 0),
    ]
    for i, (w, h, r, fill, outline, angle) in enumerate(layers):
        card = rotated_card(w, h, r, fill, outline, angle)
        x = cx - card.width // 2 + (i - 1) * 6 * mirror
        y = cy - card.height // 2 + (i - 1) * -4
        img.alpha_composite(card, (int(x), int(y)))

    d = ImageDraw.Draw(img)
    # mini document inside the front sheet
    left, top = cx - base_w // 2, cy - base_h // 2
    inner = left + 34
    d.rounded_rectangle([inner, top + 30, inner + 62, top + 92], radius=12, fill=hex_rgb(accent))
    d.rounded_rectangle([inner + 78, top + 40, inner + 200, top + 56], radius=6, fill=hex_rgb("#DDE3EC"))
    d.rounded_rectangle([inner + 78, top + 66, inner + 158, top + 80], radius=6, fill=hex_rgb("#EAEEF4"))
    y = top + 128
    widths = [232, 232, 196, 232, 150]
    for i, wdt in enumerate(widths):
        d.rounded_rectangle([inner, y, inner + wdt, y + 14], radius=6, fill=hex_rgb("#E4E9F0"))
        y += 30
    d.rounded_rectangle([inner, y + 14, inner + 232, y + 132], radius=10, fill=tint(accent, 0.90))
    d.ellipse(
        [inner + 92, y + 46, inner + 140, y + 94],
        outline=hex_rgb(accent),
        width=4,
    )
    # riding tiles, echoing the hero
    for (tx, ty, col, size, ang) in [
        (cx - 190, cy - 150, accent, 54, -12),
        (cx + 168 * mirror, cy - 118, "#FFD200", 40, 10),
        (cx + 150 * mirror, cy + 150, "#00D267", 34, -8),
        (cx - 178 * mirror, cy + 168, "#8B48FE", 30, 14),
    ]:
        tile = rotated_card(size, size, 12, hex_rgb(col), None, ang)
        img.alpha_composite(tile, (int(tx - tile.width / 2), int(ty - tile.height / 2)))


def logo_mark(d, x, y, unit=17, gap=5):
    i = 0
    for row in range(2):
        for col in range(2):
            d.rounded_rectangle(
                [x + col * (unit + gap), y + row * (unit + gap), x + col * (unit + gap) + unit, y + row * (unit + gap) + unit],
                radius=5,
                fill=hex_rgb(TILES[i]),
            )
            i += 1


def chrome(img, d, label):
    """Logo, wordmark, site address and the bottom strip — shared by all cards."""
    logo_mark(d, MARGIN, 58, 16, 5)
    f_brand = font(38, 800)
    d.text((MARGIN + 52, 52), "DocTrim", font=f_brand, fill=hex_rgb(INK))

    f_site = font(23, 600)
    tw = d.textlength("doctrim.pages.dev", font=f_site)
    d.text((W - MARGIN - tw, 62), "doctrim.pages.dev", font=f_site, fill=hex_rgb(MUTED))

    d.rounded_rectangle([MARGIN, 512, W - MARGIN, 514], radius=0, fill=hex_rgb(LINE))
    f_strip = font(23, 600)
    items = [("27 free tools", SOFT), ("No sign-up", MUTED), ("No watermarks", MUTED), ("Runs in your browser", MUTED)]
    x = MARGIN
    for i, (text, color) in enumerate(items):
        if i:
            d.text((x, 552), "·", font=f_strip, fill=hex_rgb("#BFBFBF"))
            x += d.textlength("·  ", font=f_strip)
        d.text((x, 552), text, font=f_strip, fill=hex_rgb(color))
        x += d.textlength(text + "   ", font=f_strip)


def eyebrow(d, text, accent=BRAND):
    f = font(21, 700)
    spacing = " ".join(text.upper())
    d.text((MARGIN, 168), spacing, font=f, fill=hex_rgb(accent))


def headline(d, text, size=92, weight=900, max_w=700, top=212, fill=INK):
    f = font(size, weight)
    lines = wrap(d, text, f, max_w)
    y = top
    for line in lines:
        d.text((MARGIN, y), line, font=f, fill=hex_rgb(fill))
        y += int(size * 1.06)
    return y


def sub(d, text, top, size=30, max_w=660, color=MUTED):
    f = font(size, 400)
    y = top
    for line in wrap(d, text, f, max_w)[:3]:
        d.text((MARGIN, y), line, font=f, fill=hex_rgb(color))
        y += int(size * 1.35)
    return y


BOTTOM_SAFE = 496  # nothing may cross the divider strip


def canvas():
    img = Image.new("RGBA", (W, H), (255, 255, 255, 255))
    return img, ImageDraw.Draw(img)


def truncate(draw, text, f, max_w, max_lines):
    lines = wrap(draw, text, f, max_w)
    if len(lines) <= max_lines:
        return lines
    kept = lines[:max_lines]
    last = kept[-1]
    while last and draw.textlength(last + "…", font=f) > max_w:
        last = last[:-1]
    kept[-1] = last.rstrip(" ,.;:") + "…"
    return kept


def block(d, title, desc, sizes, max_w, top, desc_size=29, desc_max_w=None, max_title_lines=2, desc_lines=2, gap=26):
    """Draws a title + description block that never collides with the bottom strip.

    Tries the largest title size that keeps the whole block above BOTTOM_SAFE.
    """
    desc_max_w = desc_max_w or max_w
    for size in sizes:
        f_title = font(size, 900 if size >= 70 else 800)
        title_lines = wrap(d, title, f_title, max_w)
        if len(title_lines) > max_title_lines:
            continue
        title_h = int(size * 1.08) * len(title_lines)
        f_desc = font(desc_size, 400)
        desc_lines_wrapped = wrap(d, desc, f_desc, desc_max_w)
        need = top + title_h + gap + int(desc_size * 1.32) * min(len(desc_lines_wrapped), desc_lines)
        if need > BOTTOM_SAFE:
            continue
        y = top
        for line in title_lines:
            d.text((MARGIN, y), line, font=f_title, fill=hex_rgb(INK))
            y += int(size * 1.08)
        y += gap - 8
        for line in truncate(d, desc, f_desc, desc_max_w, desc_lines):
            d.text((MARGIN, y), line, font=f_desc, fill=hex_rgb(MUTED))
            y += int(desc_size * 1.32)
        return y
    # fallback: smallest size, clamp the description hard
    size = sizes[-1]
    f_title = font(size, 800)
    y = top
    for line in wrap(d, title, f_title, max_w)[:max_title_lines]:
        d.text((MARGIN, y), line, font=f_title, fill=hex_rgb(INK))
        y += int(size * 1.08)
    return y


def card_tool(tool):
    img, d = canvas()
    paper_stack(img, tool["color"])
    d = ImageDraw.Draw(img)
    eyebrow(d, "Free online PDF tool")
    block(d, tool["name"], tool["desc"], sizes=[96, 88, 80, 72], max_w=610, top=206, desc_size=29, desc_max_w=580)
    chrome(img, d, tool["slug"])
    return img


def card_post(post):
    img, d = canvas()
    paper_stack(img, BRAND)
    d = ImageDraw.Draw(img)
    # category pill
    f_pill = font(21, 700)
    label = post["category"].upper()
    pw = d.textlength(label, font=f_pill)
    d.rounded_rectangle([MARGIN, 166, MARGIN + pw + 34, 206], radius=20, fill=hex_rgb("#E5EEFF"))
    d.text((MARGIN + 17, 174), label, font=f_pill, fill=hex_rgb(BRAND))
    block(d, post["title"], post["desc"], sizes=[54, 50, 46, 42], max_w=630, top=226, desc_size=24, desc_max_w=610, max_title_lines=3, desc_lines=2, gap=22)
    chrome(img, d, post["slug"])
    return img


def card_static(page):
    img, d = canvas()
    paper_stack(img, BRAND)
    d = ImageDraw.Draw(img)
    eyebrow(d, "DocTrim")
    block(d, page["title"], page["desc"], sizes=[88, 80, 72, 64], max_w=610, top=206, desc_size=28, desc_max_w=590)
    chrome(img, d, page["key"])
    return img


def card_home():
    img, d = canvas()
    paper_stack(img, BRAND)
    d = ImageDraw.Draw(img)
    eyebrow(d, "100% free · no account")
    f = font(96, 900)
    d.text((MARGIN, 202), "We make PDF", font=f, fill=hex_rgb(INK))
    d.text((MARGIN, 202 + 104), "easy.", font=f, fill=hex_rgb(INK))
    sub(d, "27 free tools. No sign-up. Right in your browser.", 436, size=28, max_w=620)
    chrome(img, d, "home")
    return img


def logo_card():
    img = Image.new("RGBA", (512, 512), (255, 255, 255, 255))
    d = ImageDraw.Draw(img)
    logo_mark(d, 168, 150, 84, 12)
    f = font(64, 800)
    tw = d.textlength("DocTrim", font=f)
    d.text(((512 - tw) / 2, 330), "DocTrim", font=f, fill=hex_rgb(INK))
    return img



# ---------------------------------------------------------------- Arabic cards
# Mirrored layout: logo and copy on the right, paper stack on the left.
AR_FONT_PATH = pathlib.Path("/root/fonts/NotoSansArabic.ttf")
AR_MUTED = "#6B6B6B"


def arfont(size: int, weight: int = 700) -> ImageFont.FreeTypeFont:
    f = ImageFont.truetype(str(AR_FONT_PATH), size)
    f.set_variation_by_axes([weight, 100])
    return f


def ar_text(d, x, y, text, f, fill, anchor="ra"):
    d.text((x, y), text, font=f, fill=fill, direction="rtl", anchor=anchor, language="ar")


def ar_wrap(d, text, f, max_w):
    lines, cur = [], ""
    for word in text.split():
        trial = f"{cur} {word}".strip()
        if not cur or d.textlength(trial, font=f, direction="rtl") <= max_w:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def ar_truncate(d, text, f, max_w, max_lines):
    lines = ar_wrap(d, text, f, max_w)
    if len(lines) <= max_lines:
        return lines
    kept = lines[:max_lines]
    last = kept[-1]
    while last and d.textlength(last + "…", font=f, direction="rtl") > max_w:
        last = last[:-1]
    kept[-1] = last.rstrip(" ،.,;:") + "…"
    return kept


def chrome_ar(img, d):
    logo_mark(d, W - MARGIN - 38, 58, 16, 5)
    f_brand = font(38, 800)
    d.text((W - MARGIN - 52, 52), "DocTrim", font=f_brand, fill=hex_rgb(INK), anchor="ra")
    f_site = font(23, 600)
    d.text((MARGIN, 62), "doctrim.pages.dev", font=f_site, fill=hex_rgb(MUTED))
    d.rounded_rectangle([MARGIN, 512, W - MARGIN, 514], radius=0, fill=hex_rgb(LINE))
    f_strip = arfont(23, 600)
    ar_text(d, W - MARGIN, 550, "27 أداة مجانية  ·  بدون تسجيل  ·  بدون علامة مائية", f_strip, hex_rgb(SOFT))


def ar_block(d, title, desc, sizes, max_w, top, desc_size=28, desc_lines=2, gap=24):
    for size in sizes:
        f_title = arfont(size, 800)
        title_lines = ar_wrap(d, title, f_title, max_w)
        if len(title_lines) > 2:
            continue
        title_h = int(size * 1.28) * len(title_lines)
        f_desc = arfont(desc_size, 400)
        need = top + title_h + gap + int(desc_size * 1.6) * min(len(ar_wrap(d, desc, f_desc, max_w)), desc_lines)
        if need > BOTTOM_SAFE:
            continue
        y = top
        for line in title_lines:
            ar_text(d, W - MARGIN, y, line, f_title, hex_rgb(INK))
            y += int(size * 1.28)
        y += gap - 6
        for line in ar_truncate(d, desc, f_desc, max_w, desc_lines):
            ar_text(d, W - MARGIN, y, line, f_desc, hex_rgb(AR_MUTED))
            y += int(desc_size * 1.6)
        return y
    return top


def ar_card(tool):
    img, d = canvas()
    paper_stack(img, tool["color"], cx=290, cy=320, mirror=-1)
    d = ImageDraw.Draw(img)
    f_eye = arfont(21, 700)
    ar_text(d, W - MARGIN, 166, "أداة PDF مجانية أونلاين", f_eye, hex_rgb(BRAND))
    ar_block(d, tool["name"], tool["desc"], [92, 84, 76, 68], 610, 204)
    chrome_ar(img, d)
    return img


def ar_simple(title, desc, key, eyebrow_text="DocTrim"):
    img, d = canvas()
    paper_stack(img, BRAND, cx=290, cy=320, mirror=-1)
    d = ImageDraw.Draw(img)
    f_eye = arfont(21, 700)
    ar_text(d, W - MARGIN, 166, eyebrow_text, f_eye, hex_rgb(BRAND))
    ar_block(d, title, desc, [78, 70, 62, 56], 610, 204, desc_size=26)
    chrome_ar(img, d)
    return img


def ar_fit(d, text, max_w, sizes, weight=800):
    """Largest size at which the line still fits inside max_w."""
    for size in sizes:
        f = arfont(size, weight)
        if d.textlength(text, font=f, direction="rtl") <= max_w:
            return f, size
    return arfont(sizes[-1], weight), sizes[-1]


def ar_home(data):
    img, d = canvas()
    paper_stack(img, BRAND, cx=290, cy=320, mirror=-1)
    d = ImageDraw.Draw(img)
    f_eye = arfont(21, 700)
    ar_text(d, W - MARGIN, 166, "مجاني بالكامل  ·  بدون تسجيل", f_eye, hex_rgb(BRAND))

    max_w = 620
    f1, s1 = ar_fit(d, "أدوات PDF بالعربية.", max_w, [84, 78, 72, 66, 60])
    ar_text(d, W - MARGIN, 208, "أدوات PDF بالعربية.", f1, hex_rgb(INK))
    f2, s2 = ar_fit(d, "بدون حساب، وبدون رفع ملفاتك.", max_w, [60, 56, 52, 48])
    ar_text(d, W - MARGIN, 208 + int(s1 * 1.3), "بدون حساب، وبدون رفع ملفاتك.", f2, hex_rgb(BRAND))
    f_sub = arfont(26, 400)
    ar_text(d, W - MARGIN, 208 + int(s1 * 1.3) + int(s2 * 1.6) + 18, "27 أداة مجانية تعمل داخل متصفحك.", f_sub, hex_rgb(AR_MUTED))
    chrome_ar(img, d)
    return img


def main():
    data = json.loads((ROOT / "scripts" / "og-data.json").read_text())
    OUT.mkdir(parents=True, exist_ok=True)
    written = 0

    def save(img, name):
        nonlocal written
        img.convert("RGB").save(OUT / f"{name}.png", "PNG", optimize=True)
        written += 1

    save(card_home(), "home")
    save(logo_card(), "logo")
    for t in data["tools"]:
        save(card_tool(t), t["slug"])
    for p in data["posts"]:
        save(card_post(p), f"blog-{p['slug']}")
    for s in data["static"]:
        if s["key"] in ("home",):
            continue
        save(card_static(s), s["key"])

    # Arabic
    ardata = data.get("ar")
    if ardata:
        save(ar_home(ardata), "ar-home")
        for t in ardata["tools"]:
            save(ar_card(t), f"ar-{t['slug']}")
        for s in ardata["static"]:
            save(ar_simple(s["title"], s["desc"], s["key"]), f"ar-{s['key']}")

    total = sum(f.stat().st_size for f in OUT.glob("*.png"))
    print(f"{written} cards written to public/og ({total / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
