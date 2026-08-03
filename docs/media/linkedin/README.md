# README demo media

Animated GIFs for the root [README.md](../../README.md). **GIFs and the onboarding still are committed; video intermediates and the source photo fixture are not.**

## Files

| GIF | Flow |
|-----|------|
| `blank-project.gif` | Blank canvas → tour → paint → save |
| `import-capybara.gif` | Photo import wizard → 64×64 Retro pixel art |
| `animation-walk.gif` | Dark shading → select/copy → 8-frame horizontal walk → play |
| `still-01-onboarding-tutorial.png` | Onboarding overlay (step 1) |

## Regenerate

```bash
./scripts/record-linkedin-media.sh
```

Requires Playwright, ffmpeg, and the capybara source PNG in `fixtures/` (copied automatically from Downloads when present).

Outputs **GIFs only** — `.mp4` / `.webm` are deleted after conversion and are gitignored.

## Not shipped

These assets are documentation-only. Desktop `.deb` / `.tar.gz` packages and `apps/web/dist` builds do not include `docs/media/`.

See also [linkedin-media-assets.md](../linkedin-media-assets.md) for the full shot list.
