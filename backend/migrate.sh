#!/bin/sh
#
# Run SQL migrations against the self-hosted Supabase Postgres instance.
#
# Usage:
#   sh migrate.sh              # Run all pending migrations
#   sh migrate.sh --dry-run    # List migrations without executing
#   sh migrate.sh --reset      # Drop migration tracking table and re-run all
#
# Migrations are read from ./migrations/*.sql, ordered by filename.
# Each migration is tracked in a `_migrations` table so it only runs once.
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/migrations"
ENV_FILE="$SCRIPT_DIR/supabase-project/.env"

# Load .env
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: .env file not found at $ENV_FILE"
    exit 1
fi

# shellcheck disable=SC2046
export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)

PGHOST="${POSTGRES_HOST:-localhost}"
PGPORT="${KONG_HTTP_PORT:-8000}"   # external port via Kong/Supavisor
PGDATABASE="${POSTGRES_DB:-postgres}"
PGPASSWORD="${POSTGRES_PASSWORD}"
PGUSER="postgres"

# When running against localhost (local dev), connect directly to the DB container
DIRECT_PORT=5432
CONTAINER="supabase-db"

DRY_RUN=false
RESET=false

for arg in "$@"; do
    case "$arg" in
        --dry-run) DRY_RUN=true ;;
        --reset)   RESET=true ;;
        *)
            echo "Unknown argument: $arg"
            echo "Usage: $0 [--dry-run] [--reset]"
            exit 1
            ;;
    esac
done

run_sql() {
    docker exec -i "$CONTAINER" \
        psql -U "$PGUSER" -d "$PGDATABASE" \
        --set ON_ERROR_STOP=1 \
        "$@"
}

# Verify container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    echo "Error: container '$CONTAINER' is not running."
    echo "Start it with: docker compose -f supabase-project/docker-compose.yml up -d db"
    exit 1
fi

echo "Connected to: $CONTAINER ($PGDATABASE)"

# Create migration tracking table
run_sql -c "
CREATE TABLE IF NOT EXISTS _migrations (
    id          SERIAL PRIMARY KEY,
    filename    TEXT NOT NULL UNIQUE,
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
" > /dev/null

if [ "$RESET" = "true" ]; then
    echo "Resetting migration history..."
    run_sql -c "TRUNCATE TABLE _migrations;" > /dev/null
fi

# Collect migration files
migration_files=$(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort)

if [ -z "$migration_files" ]; then
    echo "No migration files found in $MIGRATIONS_DIR"
    exit 0
fi

applied=0
skipped=0

for filepath in $migration_files; do
    filename=$(basename "$filepath")

    # Check if already applied
    already_applied=$(run_sql -t -c "SELECT COUNT(*) FROM _migrations WHERE filename = '$filename';" | tr -d ' ')

    if [ "$already_applied" = "1" ]; then
        echo "  skip  $filename"
        skipped=$((skipped + 1))
        continue
    fi

    if [ "$DRY_RUN" = "true" ]; then
        echo "  would apply  $filename"
        applied=$((applied + 1))
        continue
    fi

    echo "  apply $filename ..."
    run_sql < "$filepath"
    run_sql -c "INSERT INTO _migrations (filename) VALUES ('$filename');" > /dev/null
    applied=$((applied + 1))
done

echo ""
if [ "$DRY_RUN" = "true" ]; then
    echo "Dry run: $applied to apply, $skipped already applied."
else
    echo "Done: $applied applied, $skipped skipped."
fi
