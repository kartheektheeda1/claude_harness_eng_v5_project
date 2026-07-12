#!/usr/bin/env bash
# Idempotent first-time setup for symphony_clone. Safe to re-run: validates
# .env, backfills GITHUB_TOKEN from the gh CLI if possible, (re)builds the
# image, starts the container, and reports whether Claude is authenticated
# inside it.
set -euo pipefail
cd "$(dirname "$0")/.."

red()    { printf "\033[31m%s\033[0m\n" "$*"; }
green()  { printf "\033[32m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }
bold()   { printf "\033[1m%s\033[0m\n" "$*"; }

bold "[1/5] Validate .env"
if [ ! -f .env ]; then
  red "✗ .env not found (copy .env.example or fill in tracker/repo settings)"
  exit 1
fi

required_keys=(TRACKER_PROVIDER LINEAR_API_KEY LINEAR_PROJECT_SLUG TARGET_REPO_URL READY_STATE READY_LABEL)
missing_keys=()
for key in "${required_keys[@]}"; do
  value=$(grep -E "^${key}=" .env | head -1 | cut -d= -f2-)
  [ -n "$value" ] || missing_keys+=("$key")
done
if [ ${#missing_keys[@]} -gt 0 ]; then
  red "✗ .env missing required values: ${missing_keys[*]}"
  exit 1
fi
green "✓ .env has required keys"

bold "[2/5] Ensure GITHUB_TOKEN is set"
current_token=$(grep -E '^GITHUB_TOKEN=' .env | head -1 | cut -d= -f2-)
if [ -z "$current_token" ]; then
  if command -v gh >/dev/null && gh auth status >/dev/null 2>&1; then
    yellow "  GITHUB_TOKEN empty — pulling a fresh token from gh"
    fresh_token=$(gh auth token)
    if grep -qE '^GITHUB_TOKEN=' .env; then
      sed -i.bak "s|^GITHUB_TOKEN=.*|GITHUB_TOKEN=${fresh_token}|" .env && rm -f .env.bak
    else
      echo "GITHUB_TOKEN=${fresh_token}" >> .env
    fi
    green "✓ GITHUB_TOKEN written to .env from gh auth token"
  else
    yellow "⚠ GITHUB_TOKEN empty and gh CLI is not authenticated."
    yellow "   PR push will fail. Run: gh auth login   (then re-run this script)"
  fi
else
  green "✓ GITHUB_TOKEN already set in .env"
fi

bold "[3/5] Build image"
docker compose build >/dev/null
green "✓ Image built"

bold "[4/5] Start container (preserving volumes)"
docker compose up -d --force-recreate >/dev/null
deadline=$((SECONDS + 30))
while [ $SECONDS -lt $deadline ]; do
  if docker compose logs --tail=20 symphony-clone 2>&1 | grep -q orchestrator_started; then
    green "✓ Orchestrator running"
    break
  fi
  sleep 1
done

bold "[5/5] Check Claude auth inside container"
auth_output=$(docker compose exec -T -u node symphony-clone bash -c \
  'timeout 8 claude --print "respond with the single word OK" --permission-mode bypassPermissions 2>&1' \
  | head -3) || true

if echo "$auth_output" | grep -q "Not logged in"; then
  yellow "✗ Claude is NOT authenticated inside the container."
  yellow ""
  yellow "  Run this in YOUR terminal (not via this script — it needs a TTY):"
  yellow ""
  bold   "    docker exec -u node -it symphony_clone-symphony-clone-1 claude /login"
  yellow ""
  yellow "  Pick option 1 (Claude account with subscription), complete the OAuth"
  yellow "  flow in your browser, then re-run:"
  yellow ""
  bold   "    ./scripts/bootstrap.sh"
  yellow ""
  exit 2
fi

green "✓ Claude is authenticated"
echo
bold "Symphony is ready. The orchestrator polls Linear every $(grep -E '^POLL_INTERVAL_MS=' .env | cut -d= -f2- || echo 60000)ms."
bold "Move an eligible issue to '$(grep -E '^READY_STATE=' .env | cut -d= -f2-)' with label '$(grep -E '^READY_LABEL=' .env | cut -d= -f2-)' to trigger a run."
echo
echo "  Logs:        docker compose logs -f symphony-clone"
echo "  Linear ping: node scripts/diagnose-linear.js"
echo "  Stop:        docker compose down"
echo
