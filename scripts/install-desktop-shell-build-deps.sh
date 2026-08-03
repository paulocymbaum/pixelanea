#!/usr/bin/env bash
# Install system packages required to build pixelanea-shell (Tauri / WebKitGTK).
#
# Usage:
#   ./scripts/install-desktop-shell-build-deps.sh
set -euo pipefail

sudo apt-get update
sudo apt-get install -y \
  build-essential \
  pkg-config \
  libwebkit2gtk-4.1-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  patchelf
