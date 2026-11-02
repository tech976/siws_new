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

echo "==> Building"
npm run build

echo "==> Restarting $PM2_NAME"
pm2 restart "$PM2_NAME" --update-env

# A build does not change the database. Collections and blocks describe the
# schema, and seeds describe content, so flag them loudly.
if echo "$CHANGED" | grep -qE '^(src/collections/|src/blocks/|src/migrations/|payload\.config\.ts)'; then
  echo ""
  echo "!! WARNING: this push changed collections/blocks (the database schema)."
  echo "!! Production does not update the schema by itself. Follow"
  echo "!! 'Adding tables' in docs/DEPLOYMENT.md, or pages using the new"
  echo "!! fields will error."
fi
if echo "$CHANGED" | grep -qE '^src/seed/'; then
  echo ""
  echo "!! NOTE: seed scripts changed. The live database still has the old"
  echo "!! content until the relevant seed is run on the server."
fi

echo "==> Done: live site is on $(git log -1 --format='%h %s')"
