#!/usr/bin/env bash

set -euo pipefail

if [ "${1-}" = "" ]; then
  echo "Usage: $0 <version>"
  echo "Example: $0 0.2.0"
  exit 1
fi

VERSION="$1"

if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Error: version must be in form X.Y.Z (e.g. 0.2.0)"
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "Error: git is required."
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "Error: python3 is required."
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Error: working tree is not clean. Commit or stash changes first."
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

python3 <<PY
import re
from pathlib import Path

version = "$VERSION"
root = Path("$REPO_ROOT")

# Update Tauri config version
tauri_conf = root / "src-tauri" / "tauri.conf.json"
text = tauri_conf.read_text(encoding="utf-8")
new_text = re.sub(
    r'"version"\s*:\s*"[0-9]+\.[0-9]+\.[0-9]+"',
    f'"version": "{version}"',
    text,
    count=1,
)
tauri_conf.write_text(new_text, encoding="utf-8")

# Update Rust crate version
cargo_toml = root / "src-tauri" / "Cargo.toml"
text = cargo_toml.read_text(encoding="utf-8")
new_text = re.sub(
    r'^version\s*=\s*"[0-9]+\.[0-9]+\.[0-9]+"',
    f'version = "{version}"',
    text,
    count=1,
    flags=re.MULTILINE,
)
cargo_toml.write_text(new_text, encoding="utf-8")

PY

cd "$REPO_ROOT"

git add src-tauri/tauri.conf.json src-tauri/Cargo.toml
git commit -m "release: v$VERSION"
git tag "v$VERSION"

echo "Created commit and tag v$VERSION."
echo "Next steps:"
echo "  git push origin HEAD"
echo "  git push origin v$VERSION"

