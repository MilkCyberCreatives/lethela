#!/usr/bin/env bash
# Local-only full order journey test (customer, store, rider, admin) on a throwaway Postgres
# database. Builds the current commit in its own git worktree, so the main checkout's SQLite
# Prisma client is left alone. Ozow is simulated; email and WhatsApp go to a local catcher and
# every other outside host is blocked. Usage: bash scripts/run-order-journey-test.sh [--no-build]
set -euo pipefail
REPO=$(git -C "$(dirname "$0")/.." rev-parse --show-toplevel)
W=${E2E_WORKTREE:-/tmp/lethela-e2e-worktree}
DATA=/tmp/lethela-e2e-data
[ -d "$W" ] || git -C "$REPO" worktree add --detach "$W" HEAD
git -C "$W" checkout --detach -q "$(git -C "$REPO" rev-parse HEAD)"
cd "$W"
[ -d node_modules ] || npm ci --engine-strict=false
service postgresql start
su postgres -c "psql -tc \"SELECT 1 FROM pg_roles WHERE rolname='e2e'\" | grep -q 1 || psql -c \"CREATE ROLE e2e LOGIN PASSWORD 'e2e' CREATEDB\""
su postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname='lethela_e2e'\" | grep -q 1 || psql -c 'CREATE DATABASE lethela_e2e OWNER e2e'"
set -a; . scripts/e2e.env; set +a
node scripts/prisma-run.mjs generate
npx prisma db push --schema prisma/schema.postgresql.prisma --skip-generate
[ "${1:-}" = "--no-build" ] || npx next build --webpack
mkdir -p "$DATA/uploads" "$DATA/private"; : > "$DATA/outbound.jsonl"
E2E_CATCHER_LOG="$DATA/outbound.jsonl" node scripts/e2e-catcher.mjs > "$DATA/catcher.log" 2>&1 & CATCHER=$!
NODE_OPTIONS="--import $W/scripts/e2e-outbound-guard.mjs" node node_modules/next/dist/bin/next start -p 3100 > "$DATA/server.log" 2>&1 & SERVER=$!
trap 'kill $SERVER $CATCHER 2>/dev/null || true' EXIT
until curl -s -o /dev/null http://localhost:3100/api/ops/version; do sleep 1; done
grep -q guard-loaded "$DATA/outbound.jsonl" || { echo "outbound guard not loaded - refusing to test"; exit 1; }
NODE_ENV=development E2E_BASE_URL=http://localhost:3100 E2E_SHOTS_DIR="$DATA/shots" node scripts/order-journey-test.mjs
