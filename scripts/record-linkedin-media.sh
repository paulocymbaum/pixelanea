#!/usr/bin/env bash
# Record LinkedIn/README demo GIFs via Playwright (no MP4/WebM committed).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

MEDIA_DIR="${ROOT_DIR}/docs/media/linkedin"
RESULTS_DIR="${ROOT_DIR}/test-results/linkedin-media"
FIXTURE_SRC="${HOME}/Downloads/20250511_0404_Capybara on Abbey Road_simple_compose_01jtz2fxakeggrne2c34z1v0nb.png"
FIXTURE_DEST="${MEDIA_DIR}/fixtures/capybara-abbey-road.png"

mkdir -p "${MEDIA_DIR}/fixtures"

if [[ -f "${FIXTURE_SRC}" ]]; then
  cp "${FIXTURE_SRC}" "${FIXTURE_DEST}"
  echo "→ Using capybara fixture from Downloads"
elif [[ ! -f "${FIXTURE_DEST}" ]]; then
  echo "Missing capybara fixture. Place PNG at ${FIXTURE_DEST}" >&2
  exit 1
fi

to_gif() {
  local input="$1"
  local output="$2"
  ffmpeg -y -loglevel error -i "${input}" \
    -vf "fps=10,scale=720:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3" \
    -loop 0 "${output}"
}

copy_video() {
  local pattern="$1"
  local dest_name="$2"
  local found=""
  while IFS= read -r video; do
    found="${video}"
  done < <(find "${RESULTS_DIR}" -path "*${pattern}*" -name "video.webm" 2>/dev/null | head -1)

  if [[ -z "${found}" || ! -f "${found}" ]]; then
    echo "  ✗ missing recording for ${dest_name} (pattern: ${pattern})" >&2
    return 1
  fi

  local tmp_mp4="${MEDIA_DIR}/.tmp-${dest_name}.mp4"
  ffmpeg -y -loglevel error -i "${found}" -c:v libx264 -pix_fmt yuv420p "${tmp_mp4}"
  to_gif "${tmp_mp4}" "${MEDIA_DIR}/${dest_name}.gif"
  rm -f "${tmp_mp4}"
  echo "  ✓ ${dest_name}.gif"
}

echo "→ Recording demos (Playwright)"
pnpm exec playwright test --config playwright.linkedin.config.ts

echo "→ Converting to GIFs (discarding video intermediates)"
copy_video "new-canvas-tour-paint-save" "blank-project"
copy_video "photo-through-import-wizard" "import-capybara"
copy_video "frame-by-frame-walk-play" "animation-walk"

rm -f "${MEDIA_DIR}"/*.mp4 "${MEDIA_DIR}"/*.webm

echo "=== README demos ready in ${MEDIA_DIR} ==="
ls -la "${MEDIA_DIR}"/*.gif "${MEDIA_DIR}"/*.png 2>/dev/null || true
