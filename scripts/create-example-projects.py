#!/usr/bin/env python3
"""Create sample .pixelanea bundles for File → Open testing.

Requires pixelanea-server on API_PORT (default 8787). Start with:
  pnpm build:backend && ./server/build/pixelanea-server
or run this script via scripts/create-example-projects.sh (starts server if needed).
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "examples" / "projects"

API_BASE = os.environ.get("PIXELANEA_API_URL", "http://127.0.0.1:8787")


def api(method: str, path: str, body: dict | None = None) -> dict:
    data = None if body is None else json.dumps(body).encode()
    request = urllib.request.Request(
        f"{API_BASE}{path}",
        data=data,
        method=method,
        headers={"Content-Type": "application/json"} if body is not None else {},
    )
    with urllib.request.urlopen(request) as response:
        return json.load(response)


def blank_pixels(width: int, height: int) -> list[int]:
    return [0] * (width * height)


def set_pixel(pixels: list[int], width: int, x: int, y: int, index: int) -> None:
    if 0 <= x < width and 0 <= y < len(pixels) // width:
        pixels[y * width + x] = index


def fill_rect(
    pixels: list[int],
    width: int,
    x0: int,
    y0: int,
    x1: int,
    y1: int,
    index: int,
) -> None:
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            set_pixel(pixels, width, x, y, index)


def fill_circle(
    pixels: list[int],
    width: int,
    height: int,
    cx: int,
    cy: int,
    radius: int,
    index: int,
) -> None:
    radius_sq = radius * radius
    for y in range(height):
        for x in range(width):
            if (x - cx) ** 2 + (y - cy) ** 2 <= radius_sq:
                set_pixel(pixels, width, x, y, index)


def draw_smiley(width: int, height: int) -> list[int]:
    pixels = blank_pixels(width, height)
    cx, cy, radius = width // 2, height // 2, min(width, height) // 2 - 2
    fill_circle(pixels, width, height, cx, cy, radius, 5)
    eye_y = cy - 2
    set_pixel(pixels, width, cx - 3, eye_y, 2)
    set_pixel(pixels, width, cx + 3, eye_y, 2)
    for x in range(cx - 3, cx + 4):
        set_pixel(pixels, width, x, cy + 3, 2)
    return pixels


def draw_grass_tile(width: int, height: int) -> list[int]:
    pixels = blank_pixels(width, height)
    horizon = height // 2
    for y in range(horizon):
        for x in range(width):
            set_pixel(pixels, width, x, y, 4)
    for y in range(horizon, height):
        for x in range(width):
            set_pixel(pixels, width, x, y, 3)
    for x in range(0, width, 4):
        set_pixel(pixels, width, x, horizon - 1, 3)
        set_pixel(pixels, width, x + 1, horizon - 2, 3)
    return pixels


def draw_stick_figure(width: int, height: int, leg_frame: int) -> list[int]:
    pixels = blank_pixels(width, height)
    cx = width // 2
    head_y = 6
    fill_circle(pixels, width, height, cx, head_y, 2, 5)
    body_top = head_y + 3
    body_bottom = height - 8
    for y in range(body_top, body_bottom + 1):
        set_pixel(pixels, width, cx, y, 1)
    arm_y = body_top + 2
    set_pixel(pixels, width, cx - 3, arm_y, 1)
    set_pixel(pixels, width, cx - 4, arm_y + 1, 1)
    set_pixel(pixels, width, cx + 3, arm_y, 1)
    set_pixel(pixels, width, cx + 4, arm_y + 1, 1)
    hip_y = body_bottom
    stride = leg_frame % 4
    left = [(cx - 1, hip_y + 1), (cx - 2, hip_y + 3), (cx - 3, hip_y + 5)]
    right = [(cx + 1, hip_y + 1), (cx + 2, hip_y + 3), (cx + 3, hip_y + 5)]
    if stride == 1:
        left, right = right, left
    elif stride == 2:
        left = [(cx - 2, hip_y + 2), (cx - 1, hip_y + 4)]
        right = [(cx + 2, hip_y + 2), (cx + 1, hip_y + 4)]
    elif stride == 3:
        left = [(cx - 1, hip_y + 1), (cx - 1, hip_y + 4)]
        right = [(cx + 1, hip_y + 1), (cx + 1, hip_y + 4)]
    for x, y in left + right:
        set_pixel(pixels, width, x, y, 1)
    return pixels


# Original palette for the side-view character walk (slot 0 stays transparent).
CHARACTER_WALK_PALETTE = [
    "#2E2218",  # 1 outline
    "#FFD6A8",  # 2 skin
    "#7A4B2E",  # 3 hair
    "#3D85C6",  # 4 shirt
    "#2B5F94",  # 5 shirt shadow
    "#4F6D4A",  # 6 pants
    "#354A32",  # 7 pants shadow
    "#242424",  # 8 shoes
]

O = 1
S = 2
H = 3
T = 4
TS = 5
P = 6
PS = 7
SH = 8


def stamp_sprite(
    pixels: list[int],
    width: int,
    origin_x: int,
    origin_y: int,
    rows: list[str],
    color_map: dict[str, int],
) -> None:
    for row_index, row in enumerate(rows):
        for col_index, char in enumerate(row):
            if char == ".":
                continue
            color = color_map.get(char)
            if color is None:
                continue
            set_pixel(pixels, width, origin_x + col_index, origin_y + row_index, color)


def draw_character_head(pixels: list[int], width: int, ox: int, oy: int) -> None:
    stamp_sprite(
        pixels,
        width,
        ox,
        oy,
        [
            "..OOO..",
            ".OSSSO.",
            ".OSHSS.",
            ".OSSSO.",
            "..OOO..",
        ],
        {"O": O, "S": S, "H": H},
    )


def draw_character_torso(pixels: list[int], width: int, ox: int, oy: int) -> None:
    stamp_sprite(
        pixels,
        width,
        ox,
        oy,
        [
            ".OOOO.",
            "OTTTTO",
            "OTSTTO",
            "OTTTTO",
            ".OOOO.",
        ],
        {"O": O, "T": T, "S": TS},
    )


def draw_character_arm(
    pixels: list[int],
    width: int,
    ox: int,
    oy: int,
    *,
    back: bool,
) -> None:
    rows = ["O", "S", "S", "O"] if back else ["O", "S", "O"]
    color_map = {"O": O, "S": S}
    for row_index, row in enumerate(rows):
        set_pixel(pixels, width, ox, oy + row_index, color_map[row])


def draw_character_leg(
    pixels: list[int],
    width: int,
    ox: int,
    oy: int,
    pose: str,
) -> None:
    patterns = {
        "back": [
            ".O.",
            "OPO",
            "OPO",
            "OSO",
            ".O.",
        ],
        "plant": [
            ".O.",
            "OPO",
            "OPO",
            "OSO",
            "OSH",
            "OSH",
        ],
        "pass": [
            "..O",
            ".OP",
            ".OP",
            ".OS",
            ".OS",
        ],
        "lift": [
            ".O.",
            "OP.",
            "OP.",
            "OS.",
            ".O.",
        ],
    }
    stamp_sprite(pixels, width, ox, oy, patterns[pose], {"O": O, "P": P, "S": PS, "H": SH})


def draw_character_walk(width: int, height: int, frame_index: int) -> list[int]:
    pixels = blank_pixels(width, height)
    ox = 11
    oy = 5

    leg_poses = [
        ("plant", "back"),
        ("plant", "lift"),
        ("pass", "pass"),
        ("lift", "plant"),
        ("back", "plant"),
        ("lift", "plant"),
        ("pass", "pass"),
        ("plant", "lift"),
    ]
    left_pose, right_pose = leg_poses[frame_index % 8]

    arm_back = frame_index % 8 in {0, 1, 4, 5}
    draw_character_arm(pixels, width, ox - 2, oy + 6, back=arm_back)
    draw_character_leg(pixels, width, ox + 1, oy + 10, left_pose)
    draw_character_torso(pixels, width, ox, oy + 5)
    draw_character_head(pixels, width, ox + 1, oy)
    draw_character_leg(pixels, width, ox + 4, oy + 10, right_pose)
    draw_character_arm(pixels, width, ox + 6, oy + 6, back=not arm_back)
    return pixels


def draw_bounce_ball(width: int, height: int, frame_index: int, frame_count: int) -> list[int]:
    pixels = blank_pixels(width, height)
    cx = width // 2
    phase = frame_index / max(frame_count - 1, 1)
    cy = int(3 + phase * (height - 8))
    fill_circle(pixels, width, height, cx, cy, 3, 4)
    return pixels


def create_project(
    *,
    name: str,
    width: int,
    height: int,
    frame_count: int,
    asset_type: str = "character",
    fps: int = 8,
    loop: bool = True,
) -> str:
    project = api(
        "POST",
        "/api/projects",
        {
            "name": name,
            "width": width,
            "height": height,
            "frameCount": frame_count,
            "fps": fps,
            "assetType": asset_type,
            "loop": loop,
        },
    )
    return project["id"]


def put_palette(project_id: str, colors: list[str]) -> None:
    api(
        "PUT",
        f"/api/projects/{project_id}/palette",
        {"colors": [{"slot": index + 1, "hex": hex_color} for index, hex_color in enumerate(colors)]},
    )


def put_frame(project_id: str, frame_index: int, pixels: Iterable[int]) -> None:
    api(
        "PUT",
        f"/api/projects/{project_id}/frames/{frame_index}",
        {"pixels": list(pixels)},
    )


def save_project(project_id: str, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    api("POST", f"/api/projects/{project_id}/save", {"path": str(path.resolve())})


def verify_open(path: Path) -> None:
    opened = api("POST", "/api/projects/open", {"path": str(path.resolve())})
    if opened.get("name") is None:
        raise RuntimeError(f"open verification failed for {path}")


def build_blank_starter(path: Path) -> None:
    project_id = create_project(
        name="Workshop Starter",
        width=32,
        height=32,
        frame_count=8,
        asset_type="character",
    )
    save_project(project_id, path)
    verify_open(path)


def build_happy_face(path: Path) -> None:
    project_id = create_project(name="Happy Face", width=16, height=16, frame_count=1)
    put_frame(project_id, 0, draw_smiley(16, 16))
    save_project(project_id, path)
    verify_open(path)


def build_grass_tile(path: Path) -> None:
    project_id = create_project(
        name="Grass Tile",
        width=16,
        height=16,
        frame_count=1,
        asset_type="background",
    )
    put_frame(project_id, 0, draw_grass_tile(16, 16))
    save_project(project_id, path)
    verify_open(path)


def build_bounce_ball(path: Path) -> None:
    frame_count = 8
    project_id = create_project(
        name="Bounce Ball",
        width=16,
        height=16,
        frame_count=frame_count,
        asset_type="animation",
        fps=12,
    )
    for index in range(frame_count):
        put_frame(project_id, index, draw_bounce_ball(16, 16, index, frame_count))
    save_project(project_id, path)
    verify_open(path)


def build_walk_cycle(path: Path) -> None:
    frame_count = 8
    project_id = create_project(
        name="Walk Cycle",
        width=32,
        height=32,
        frame_count=frame_count,
        asset_type="animation",
        fps=8,
    )
    for index in range(frame_count):
        put_frame(project_id, index, draw_stick_figure(32, 32, index))
    save_project(project_id, path)
    verify_open(path)


def build_character_walk(path: Path) -> None:
    frame_count = 8
    project_id = create_project(
        name="Character Walk",
        width=32,
        height=32,
        frame_count=frame_count,
        asset_type="character",
        fps=8,
    )
    put_palette(project_id, CHARACTER_WALK_PALETTE)
    for index in range(frame_count):
        put_frame(project_id, index, draw_character_walk(32, 32, index))
    save_project(project_id, path)
    verify_open(path)


def build_pixel_heart(path: Path) -> None:
    project_id = create_project(
        name="Pixel Heart",
        width=16,
        height=16,
        frame_count=1,
        asset_type="prop",
    )
    pixels = blank_pixels(16, 16)
    heart = [
        "..##..##..",
        ".########.",
        ".########.",
        "..######..",
        "...####...",
        "....##....",
    ]
    offset_x = 3
    offset_y = 4
    for row, pattern in enumerate(heart):
        for col, char in enumerate(pattern):
            if char == "#":
                set_pixel(pixels, 16, offset_x + col, offset_y + row, 2)
    put_frame(project_id, 0, pixels)
    save_project(project_id, path)
    verify_open(path)


EXAMPLES = [
    ("blank-starter.pixelanea", build_blank_starter, "Empty 32×32 canvas, 8 frames — workshop blank slate"),
    ("happy-face.pixelanea", build_happy_face, "16×16 smiley sprite, 1 frame"),
    ("pixel-heart.pixelanea", build_pixel_heart, "16×16 red heart prop, 1 frame"),
    ("grass-tile.pixelanea", build_grass_tile, "16×16 sky/grass background tile"),
    ("bounce-ball.pixelanea", build_bounce_ball, "16×16 bouncing ball, 8 frames @ 12 fps"),
    ("walk-cycle.pixelanea", build_walk_cycle, "32×32 stick figure walk, 8 frames @ 8 fps"),
    (
        "character-walk.pixelanea",
        build_character_walk,
        "32×32 character walk with original palette, 8 frames @ 8 fps",
    ),
]


def main() -> int:
    try:
        api("GET", "/api/health")
    except urllib.error.URLError as error:
        print(f"error: pixelanea-server not reachable at {API_BASE}", file=sys.stderr)
        print(f"  ({error})", file=sys.stderr)
        print("Start it with: ./server/build/pixelanea-server", file=sys.stderr)
        return 1

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Writing example projects to {OUT_DIR}")

    for filename, builder, description in EXAMPLES:
        path = OUT_DIR / filename
        print(f"  → {filename} — {description}")
        builder(path)

    readme = OUT_DIR / "README.md"
    lines = [
        "# Example Pixelanea projects",
        "",
        "Use these `.pixelanea` files to test **File → Open** without creating art first.",
        "",
        "| File | What to expect |",
        "|------|----------------|",
    ]
    for filename, _, description in EXAMPLES:
        lines.append(f"| `{filename}` | {description} |")
    lines.extend(
        [
            "",
            "## How to open",
            "",
            "1. Start Pixelanea: `pnpm dev` (or the desktop launcher).",
            "2. Choose **File → Open**.",
            "3. Pick any file from this folder.",
            "",
            "If the native file picker does not appear, type the full path in the manual path field,",
            "for example:",
            "",
            f"```",
            f"{OUT_DIR.resolve()}/happy-face.pixelanea",
            f"```",
            "",
            "## Regenerate",
            "",
            "```bash",
            "./scripts/create-example-projects.sh",
            "```",
            "",
        ]
    )
    readme.write_text("\n".join(lines), encoding="utf-8")
    print(f"Done. {len(EXAMPLES)} projects ready.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
