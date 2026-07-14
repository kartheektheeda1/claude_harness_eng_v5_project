#!/usr/bin/env bash
# Sync this canonical symphony_clone into the claude_harness_eng_v5 template so
# scaffold-derived projects inherit fixes made here. Skips secrets (.env),
# local artifacts, and node_modules.
set -euo pipefail

SRC="$(cd "$(dirname "$0")/.." && pwd)"
DST="${1:-$SRC/../claude_harness_eng_v5/symphony_clone}"

if [ ! -d "$DST" ]; then
  echo "Target directory does not exist: $DST" >&2
  echo "Usage: $0 [<target-symphony_clone-path>]" >&2
  exit 1
fi

echo "Sync source : $SRC"
echo "Sync target : $DST"
echo

rsync -a --delete \
  --exclude='.env' \
  --exclude='.env.bak' \
  --exclude='node_modules/' \
  --exclude='.DS_Store' \
  --exclude='test/.tmp/' \
  --exclude='.git/' \
  --exclude='scripts/new-project.sh' \
  "$SRC/" "$DST/"

# rsync --delete would remove the destination's own .env if one existed; flag it
# rather than assuming .env.example survived the sync silently.
if [ ! -f "$DST/.env.example" ]; then
  echo "WARNING: $DST/.env.example missing after sync — was it tracked in source?" >&2
fi

echo
echo "Diff after sync (should be empty or only show .env):"
diff -rq "$SRC" "$DST" 2>&1 | grep -v node_modules || echo "(no differences)"
