# Example Pixelanea projects

Use these `.pixelanea` files to test **File → Open** without creating art first.

| File | What to expect |
|------|----------------|
| `blank-starter.pixelanea` | Empty 32×32 canvas, 8 frames — workshop blank slate |
| `happy-face.pixelanea` | 16×16 smiley sprite, 1 frame |
| `pixel-heart.pixelanea` | 16×16 red heart prop, 1 frame |
| `grass-tile.pixelanea` | 16×16 sky/grass background tile |
| `bounce-ball.pixelanea` | 16×16 bouncing ball, 8 frames @ 12 fps |
| `walk-cycle.pixelanea` | 32×32 stick figure walk, 8 frames @ 8 fps |

## How to open

1. Start Pixelanea: `pnpm dev` (or the desktop launcher).
2. Choose **File → Open**.
3. Pick any file from this folder.

If the native file picker does not appear, type the full path in the manual path field,
for example:

```
/home/paulo-yapper/pixelanea/examples/projects/happy-face.pixelanea
```

## Regenerate

```bash
./scripts/create-example-projects.sh
```
