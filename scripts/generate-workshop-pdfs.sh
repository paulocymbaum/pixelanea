#!/usr/bin/env bash
# Generate printable PDFs for the workshop teacher kit (E2-014).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PRINT_DIR="${ROOT_DIR}/docs/workshop/print"
OUT_DIR="${ROOT_DIR}/docs/workshop/pdf"

mkdir -p "${OUT_DIR}"

CHROME=""
for candidate in google-chrome google-chrome-stable chromium chromium-browser; do
  if command -v "${candidate}" >/dev/null 2>&1; then
    CHROME="${candidate}"
    break
  fi
done

if [[ -z "${CHROME}" ]]; then
  echo "No Chrome/Chromium found for PDF generation" >&2
  exit 1
fi

generate_pdf() {
  local html_name="$1"
  local pdf_name="$2"
  local html_path="${PRINT_DIR}/${html_name}"
  local pdf_path="${OUT_DIR}/${pdf_name}"

  "${CHROME}" \
    --headless=new \
    --disable-gpu \
    --no-pdf-header-footer \
    --print-to-pdf="${pdf_path}" \
    "file://${html_path}"

  echo "Wrote ${pdf_path}"
}

echo "==> Generating workshop PDFs"
generate_pdf "facilitator-one-pager.html" "facilitator-one-pager.pdf"
generate_pdf "student-handout.html" "student-handout.pdf"
echo "==> Done"
