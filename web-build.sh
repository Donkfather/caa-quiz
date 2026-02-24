#!/usr/bin/env bash
set -euo pipefail

# Simple web build: copy only the assets needed for the static web version
# into ./public, în aceeași structură folosită de GitHub Pages.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "Cleaning public/..."
rm -rf public
mkdir -p public/web
mkdir -p public/src

echo "Copying web assets..."
cp -R web/* public/web/
cp src-tauri/icons/icon.png public/web/favicon.png
cp questions.json public/
cp src/quiz-core.js public/src/
cp src/style.css public/src/

echo "Web build completed in ./public"

