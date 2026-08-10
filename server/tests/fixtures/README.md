# Server test fixtures

## pixelate_4k.png / pixelate_4k_png.inc

Embedded 3840×2160 PNG used by `[pixelate][benchmark]` decode+pipeline test in `pixelate_pipeline_test.cpp`.

**Regenerate** after editing the PNG:

```bash
./scripts/regen-pixelate-4k-fixture.sh
```

The script writes `pixelate_4k_png.inc` as a `constexpr std::array` included by the test binary.
