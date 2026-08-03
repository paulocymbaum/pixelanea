#!/usr/bin/env python3
"""Rasterize Pixelanea brand marks to PNG favicons and PWA icons (sharp pixels, no AA)."""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "apps" / "web" / "public"
LINUX_HICOLOR = ROOT / "packaging" / "linux" / "icons" / "hicolor"
LINUX_ICON_SIZES = (16, 22, 24, 32, 48, 64, 128, 256)

INK = (24, 24, 27, 255)  # #18181B
GREEN = (63, 111, 90, 255)  # #3F6F5A
NEUTRAL = (209, 209, 214, 255)  # #D1D1D6
MIST = (244, 244, 246, 255)  # #F4F4F6

# P·Mark cell occupancy: (col, row) -> color key ('ink' | 'accent')
PMARK_CELLS: dict[tuple[int, int], str] = {
    (0, 0): "ink",
    (1, 0): "ink",
    (0, 1): "ink",
    (1, 1): "accent",
    (0, 2): "ink",
    (1, 2): "ink",
}

# 4×4 glyph: True = neutral, accent at (3, 3)
GLYPH_NEUTRAL = {
    (c, r)
    for r in range(4)
    for c in range(4)
    if (c, r) != (3, 3)
}


def _color(key: str) -> tuple[int, int, int, int]:
    if key == "ink":
        return INK
    if key == "accent":
        return GREEN
    if key == "neutral":
        return NEUTRAL
    if key == "mist":
        return MIST
    raise KeyError(key)


def draw_pmark(size: int) -> Image.Image:
    """Draw P·Mark scaled to fit in `size`×`size` (square bounds)."""
    cols, rows = 2, 3
    cell = size // max(cols, rows)
    img_w = cols * cell
    img_h = rows * cell
    img = Image.new("RGBA", (img_w, img_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    for (c, r), key in PMARK_CELLS.items():
        x0 = c * cell
        y0 = r * cell
        draw.rectangle([x0, y0, x0 + cell - 1, y0 + cell - 1], fill=_color(key))
    return img


def draw_glyph(size: int) -> Image.Image:
    """Draw 4×4 grid mark at exact pixel size."""
    cell = size // 4
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    for r in range(4):
        for c in range(4):
            key = "neutral" if (c, r) in GLYPH_NEUTRAL else "accent"
            x0 = c * cell
            y0 = r * cell
            draw.rectangle([x0, y0, x0 + cell - 1, y0 + cell - 1], fill=_color(key))
    return img


def draw_garden_frame(size: int) -> Image.Image:
    """Garden Frame app icon: rounded square, inset border, centered P·Mark."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    radius = round(size * 112 / 512)
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=MIST)
    inset = max(1, round(size * 2 / 512))
    inner_radius = max(0, radius - inset)
    draw.rounded_rectangle(
        [inset, inset, size - 1 - inset, size - 1 - inset],
        radius=inner_radius,
        outline=NEUTRAL,
        width=inset,
    )

    mark_cols, mark_rows = 2, 3
    padding = round(size * 0.18)
    avail_w = size - 2 * padding
    avail_h = size - 2 * padding
    cell = min(avail_w // mark_cols, avail_h // mark_rows)
    mark_w = mark_cols * cell
    mark_h = mark_rows * cell
    ox = (size - mark_w) // 2
    oy = (size - mark_h) // 2

    for (c, r), key in PMARK_CELLS.items():
        x0 = ox + c * cell
        y0 = oy + r * cell
        draw.rectangle([x0, y0, x0 + cell - 1, y0 + cell - 1], fill=_color(key))

    return img


def _save_resized(src: Image.Image, path: Path, size: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if src.size == (size, size):
        src.save(path, format="PNG")
        return
    resized = src.resize((size, size), Image.Resampling.NEAREST)
    resized.save(path, format="PNG")


def generate_linux_hicolor_icons(dest: Path = LINUX_HICOLOR) -> None:
    """Freedesktop hicolor icons: garden frame (app) + grid glyph (.pixelanea MIME)."""
    glyph_master = draw_glyph(256)
    app_master = draw_garden_frame(256)
    for size in LINUX_ICON_SIZES:
        mime_dir = dest / f"{size}x{size}" / "mimetypes"
        apps_dir = dest / f"{size}x{size}" / "apps"
        mime_dir.mkdir(parents=True, exist_ok=True)
        apps_dir.mkdir(parents=True, exist_ok=True)
        _save_resized(glyph_master, mime_dir / "application-x-pixelanea.png", size)
        _save_resized(app_master, apps_dir / "pixelanea.png", size)


def generate_all(public_dir: Path = PUBLIC) -> None:
    favicon_dir = public_dir / "favicon"
    icons_dir = public_dir / "icons"

    glyph_16 = draw_glyph(16)
    glyph_32 = draw_glyph(32)
    _save_resized(glyph_16, favicon_dir / "favicon-16x16.png", 16)
    _save_resized(glyph_32, favicon_dir / "favicon-32x32.png", 32)

    garden_512 = draw_garden_frame(512)
    _save_resized(garden_512, icons_dir / "icon-512.png", 512)
    _save_resized(garden_512, icons_dir / "icon-192.png", 192)
    _save_resized(garden_512, favicon_dir / "apple-touch-icon.png", 180)

    generate_linux_hicolor_icons()


def main() -> int:
    out = PUBLIC
    if len(sys.argv) > 1:
        out = Path(sys.argv[1])
    generate_all(out)
    print(f"Generated brand PNGs under {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
