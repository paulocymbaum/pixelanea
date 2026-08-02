# Export submenu — UX spec (E2-006)

## Goal

One File → **Export** entry with format choices grouped together. Riley finds engine handoff without menu sprawl.

## Structure

```text
File
├── New
├── Open
├── Import image
├── Save
├── Save As
└── Export ›
    ├── PNG (current frame)
    ├── Spritesheet (all frames)
    └── GIF animation
```

## Rules

| Rule | Rationale |
|------|-----------|
| Export disabled when no project loaded (`!canSave`) | Nothing to export |
| Off-palette guard applies to all three formats | Alex/modder trust |
| Success toast names the downloaded file | Plain feedback (DESIGN.md voice) |
| GIF requires ≥2 frames | Server encoder constraint |
| Spritesheet loads all frames before download | Horizontal strip in `exportFrame.ts` |

## Implementation

- `apps/web/src/shell/fileMenuItems.ts` — builds submenu entries from `features.ts`
- `apps/web/src/shell/FileMenu.tsx` — Radix `DropdownMenuSub`
- `apps/web/src/shell/exportActions.ts` — PNG / spritesheet / GIF orchestration
