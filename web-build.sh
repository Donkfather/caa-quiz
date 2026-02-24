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
cp src-tauri/icons/icon.ico public/web/favicon.ico
cp questions.json public/
cp src/quiz-core.js public/src/
cp src/style.css public/src/
cat > public/CNAME <<'EOF'
caa-quiz.bhdit.com
EOF
cat > public/index.html <<'EOF'
<!doctype html>
<html lang="ro">
  <head>
    <meta charset="utf-8" />
    <meta
      http-equiv="refresh"
      content="0; url=web/"
    />
    <title>CAA Quiz – redirecționare</title>
  </head>
  <body>
    <p>
      Dacă nu ești redirecționat automat, mergi la
      <a href="web/">CAA Quiz</a>.
    </p>
  </body>
</html>
EOF

echo "Web build completed in ./public"

