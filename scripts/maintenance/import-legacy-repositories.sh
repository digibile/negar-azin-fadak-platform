#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEST="$ROOT/legacy-imports/repositories"
mkdir -p "$DEST"
import_repo() {
  local repo="$1" sha="$2" name="$3" tmp
  tmp="$(mktemp -d)"
  git clone --quiet --no-checkout "https://github.com/${repo}.git" "$tmp/repo"
  git -C "$tmp/repo" fetch --quiet --depth 1 origin "$sha"
  git -C "$tmp/repo" checkout --quiet --detach FETCH_HEAD
  mkdir -p "$DEST/$name"
  rsync -a --delete --exclude='.git' "$tmp/repo/" "$DEST/$name/"
  rm -rf "$tmp"
}
import_repo digibile/digibail 19385d032f73c472b98092d4efc006be711f033a digibail
import_repo digibile/sarajon 125bd69eb24fb309057cf144c4856c4253929f0f sarajon
import_repo digibile/vamcity 46111e031fbed89bccab324bead1b4bb3f30089c vamcity
mkdir -p "$DEST/negarazin-accounting/source-package"
unzip -q -o "$ROOT/legacy-imports/_archives/negarazin-accounting-source.zip" -d "$DEST/negarazin-accounting/source-package"
find "$DEST" -type f \( -name '.env' -o -name '*.pem' -o -name '*.key' -o -name 'id_rsa*' -o -name 'id_ed25519*' \) -delete
find "$DEST" -type d \( -name node_modules -o -name .git -o -name bin -o -name obj -o -name .next \) -prune -exec rm -rf {} +
printf 'Imported source files: '; find "$DEST" -type f | wc -l
