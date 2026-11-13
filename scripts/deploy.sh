#!/usr/bin/env bash
#
# Updates the live site. Run on the VPS by .github/workflows/deploy.yml after
# every push to main; can also be run by hand on the server.
#
# The steps are the ones in docs/DEPLOYMENT.md ("Deploying an update"). The
# order matters: if the pull or the build fails, the script stops before the
# restart, so the site keeps serving the last good build.
#
# Settings (all optional):
#   APP_DIR   project folder on the server  (default: /home/siws/app)
#   PM2_NAME  pm2 process name              (default: siws)
#   BRANCH    branch to deploy              (default: main)

set -euo pipefail

APP_DIR="${APP_DIR:-/home/siws/app}"
PM2_NAME="${PM2_NAME:-siws}"
BRANCH="${BRANCH:-main}"

cd "$APP_DIR"
echo "==> Deploying $BRANCH in $APP_DIR"

BEFORE=$(git rev-parse HEAD)

# Fast-forward only: if someone edited files on the server, stop and say so
# rather than silently overwriting their work.
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git merge --ff-only "origin/$BRANCH"

AFTER=$(git rev-parse HEAD)
if [ "$BEFORE" = "$AFTER" ]; then
  echo "==> Already up to date ($AFTER). Nothing to do."
  exit 0
fi
echo "==> $BEFORE -> $AFTER"

CHANGED=$(git diff --name-only "$BEFORE" "$AFTER")

# Only reinstall packages when they changed: npm ci wipes node_modules,
# which is slow and briefly breaks the running app.
if echo "$CHANGED" | grep -qE '^(package\.json|package-lock\.json)$'; then
  echo "==> Packages changed, running npm ci"
  npm ci
fi

# DATABASE FIRST. New code that reads a column the database does not have yet
# takes every page down (2026-11-04). So when the collections change, back up
# the database and add the new tables/columns before building. Additive
# changes only: anything that would delete data stops the deploy here, and
# the site keeps running the previous build.
if echo "$CHANGED" | grep -qE '^(src/collections/|src/blocks/|src/fields/|src/globals/|src/payload\.config\.ts)'; then
  echo "==> Collections changed: backing up the database"
  set -a; . ./.env; set +a
  BACKUP="$HOME/backup-before-$(date +%Y%m%d-%H%M%S)-${AFTER:0:7}.sql.gz"
  pg_dump "$DATABASE_URI" | gzip > "$BACKUP"
  echo "    saved $BACKUP"
  # Keep the newest 15 automatic backups.
  ls -1t "$HOME"/backup-before-2*.sql.gz 2>/dev/null | tail -n +16 | xargs -r rm -f

  echo "==> Updating the database tables"
  SYNC_LOG=$(NODE_ENV=development PAYLOAD_ALLOW_SCHEMA_PUSH=true SIWS_NO_TIMERS=true     timeout 300 npx tsx src/scripts/schema-sync.ts 2>&1 || true)
  echo "$SYNC_LOG" | grep -v "Pulling schema" | tail -15
  if ! echo "$SYNC_LOG" | grep -q "SCHEMA-SYNC-OK"; then
    echo "!! The database could not be updated automatically (the change may"
    echo "!! delete data). Stopping before the build: the site keeps running"
    echo "!! the previous version. Backup: $BACKUP"
    git reset --hard "$BEFORE"
    exit 1
  fi
fi

echo "==> Building"
npm run build

echo "==> Restarting $PM2_NAME"
pm2 restart "$PM2_NAME" --update-env

if echo "$CHANGED" | grep -qE '^src/seed/'; then
  echo ""
  echo "!! NOTE: seed scripts changed. The live database still has the old"
  echo "!! content until the relevant seed is run on the server."
fi

echo "==> Done: live site is on $(git log -1 --format='%h %s')"
