#!/usr/bin/env bash
#
# BR-DPA-10 — nightly backup of the database and the uploaded media.
#
#   DATABASE  a full pg_dump, gzipped, one per night, kept BACKUP_KEEP_DAYS.
#   MEDIA     an rsync snapshot of media/, one per night. Files that have not
#             changed are hard-linked to the previous night's copy, so a
#             snapshot costs only what was uploaded that day, while each one is
#             still a complete, browsable copy.
#
# Everything is written owner-only (umask 077): a dump holds every enquiry,
# every feedback message and every data request — it is personal data.
#
# Two things this cannot do on its own, and which SIWS must supply:
#
#   ENCRYPTION   set BACKUP_GPG_RECIPIENT to a public key imported for this
#                user, and each dump is encrypted to it and the plain copy
#                removed. Only the holder of the private key can restore.
#   OFF-SITE     set BACKUP_OFFSITE to an rsync destination (user@host:path),
#                and both the dumps and the latest media snapshot are pushed
#                there. A backup on the same disk does not survive the disk.
#
# Run nightly from the siws user's crontab, BEFORE the retention job, so the
# night's deletions always have a copy taken just before them:
#
#   45 1 * * * /home/siws/app/scripts/backup.sh >> /home/siws/backup.log 2>&1
#
# Restore: see "Backups" in docs/DEPLOYMENT.md.

set -euo pipefail
umask 077

APP_DIR="${APP_DIR:-/home/siws/app}"
BACKUP_DIR="${BACKUP_DIR:-/home/siws/backups}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-30}"
KEEP_MEDIA="${BACKUP_KEEP_MEDIA:-14}"

stamp="$(date +%F-%H%M)"
log() { echo "$(date '+%F %T') $*"; }
fail() { log "FAILED: $*"; exit 1; }

# The connection string lives in the app's .env; nothing is duplicated here.
DATABASE_URI="$(grep -m1 '^DATABASE_URI=' "$APP_DIR/.env" | cut -d= -f2- | tr -d '"'"'")"
[ -n "$DATABASE_URI" ] || fail "no DATABASE_URI in $APP_DIR/.env"

mkdir -p "$BACKUP_DIR/db" "$BACKUP_DIR/media"
chmod 700 "$BACKUP_DIR" "$BACKUP_DIR/db" "$BACKUP_DIR/media"

# ---- Database ---------------------------------------------------------------
dump="$BACKUP_DIR/db/siws-$stamp.sql.gz"
pg_dump --no-owner --no-privileges "$DATABASE_URI" | gzip > "$dump.partial"

# A dump that stopped half way still gzips cleanly; pg_dump's closing comment
# is the only proof it finished. It is not the last line — 16.10 and later end
# with `\unrestrict <key>` — so look a little way back.
gzip -t "$dump.partial" || fail "the dump is not a valid gzip file"
zcat "$dump.partial" | tail -n 20 | grep -q 'PostgreSQL database dump complete' \
  || fail "the dump did not finish"
mv "$dump.partial" "$dump"

if [ -n "${BACKUP_GPG_RECIPIENT:-}" ]; then
  gpg --batch --yes --trust-model always --recipient "$BACKUP_GPG_RECIPIENT" \
    --output "$dump.gpg" --encrypt "$dump"
  rm -f "$dump"
  dump="$dump.gpg"
fi
log "database: $(basename "$dump") ($(du -h "$dump" | cut -f1))"

# ---- Media ------------------------------------------------------------------
latest="$BACKUP_DIR/media/latest"
snapshot="$BACKUP_DIR/media/media-$stamp"
if [ -d "$latest" ]; then
  rsync -a --delete --link-dest="$(readlink -f "$latest")" "$APP_DIR/media/" "$snapshot/"
else
  rsync -a --delete "$APP_DIR/media/" "$snapshot/"
fi
ln -sfn "$snapshot" "$latest"
log "media: $(basename "$snapshot") ($(find "$snapshot" -type f | wc -l) files)"

# ---- Off-site ---------------------------------------------------------------
if [ -n "${BACKUP_OFFSITE:-}" ]; then
  rsync -a "$BACKUP_DIR/db/" "$BACKUP_OFFSITE/db/"
  rsync -a --delete "$snapshot/" "$BACKUP_OFFSITE/media/"
  log "off-site: copied to $BACKUP_OFFSITE"
else
  log "off-site: NOT CONFIGURED — these copies are on the same disk as the site"
fi

# ---- Retention --------------------------------------------------------------
# Only ever files this script made, matched by name.
find "$BACKUP_DIR/db" -maxdepth 1 -type f -name 'siws-*.sql.gz*' -mtime +"$KEEP_DAYS" -delete
find "$BACKUP_DIR/db" -maxdepth 1 -type f -name '*.partial' -mtime +1 -delete
ls -1d "$BACKUP_DIR/media"/media-* 2>/dev/null | sort | head -n -"$KEEP_MEDIA" | while read -r old; do
  [ "$(readlink -f "$latest")" = "$old" ] || rm -rf -- "$old"
done

log "done"
