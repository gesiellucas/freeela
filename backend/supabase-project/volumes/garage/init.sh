#!/bin/sh
#
# Garage S3 entrypoint: generates config from env vars, starts the server,
# and initializes the cluster layout, bucket, and access key on first run.
#
set -e

CONFIG_FILE="/tmp/garage.toml"

# ---------------------------------------------------------------------------
# Generate garage.toml from environment variables
# ---------------------------------------------------------------------------
cat > "$CONFIG_FILE" << TOML
metadata_dir = "/var/lib/garage/meta"
data_dir     = "/var/lib/garage/data"
db_engine    = "sqlite"

replication_factor = 1

rpc_bind_addr   = "[::]:3901"
rpc_public_addr = "127.0.0.1:3901"
rpc_secret      = "${GARAGE_RPC_SECRET}"

[s3_api]
s3_region    = "${REGION:-garage}"
api_bind_addr = "[::]:3900"

[admin]
api_bind_addr = "[::]:3903"
admin_token   = "${GARAGE_ADMIN_TOKEN}"
TOML

# Convenience wrapper so all CLI calls use the same config
garage() { /garage -c "$CONFIG_FILE" "$@"; }

# ---------------------------------------------------------------------------
# Start Garage in the background
# ---------------------------------------------------------------------------
echo "[garage-init] Starting Garage server..."
/garage -c "$CONFIG_FILE" server &
GARAGE_PID=$!

# ---------------------------------------------------------------------------
# Wait for the admin API to be available
# ---------------------------------------------------------------------------
echo "[garage-init] Waiting for admin API..."
until garage status > /dev/null 2>&1; do
    sleep 1
done
echo "[garage-init] Garage is up."

# ---------------------------------------------------------------------------
# Apply cluster layout (idempotent — errors are ignored on restart)
# ---------------------------------------------------------------------------
NODE_ID=$(garage node id -q 2>/dev/null | cut -d@ -f1)
echo "[garage-init] Node ID: ${NODE_ID}"

garage layout assign -z dc1 -c 1G "${NODE_ID}" > /dev/null 2>&1 || true
garage layout apply --version 1                 > /dev/null 2>&1 || true
echo "[garage-init] Layout applied."

# ---------------------------------------------------------------------------
# Create bucket (idempotent)
# ---------------------------------------------------------------------------
garage bucket create "${GLOBAL_S3_BUCKET}" > /dev/null 2>&1 || true
echo "[garage-init] Bucket '${GLOBAL_S3_BUCKET}' ready."

# ---------------------------------------------------------------------------
# Import access key with known credentials (idempotent)
# MINIO_ROOT_USER  → key ID
# MINIO_ROOT_PASSWORD → secret key
# ---------------------------------------------------------------------------
garage key import -n supabase \
    "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}" > /dev/null 2>&1 || true

garage bucket allow \
    --read --write --owner \
    --bucket "${GLOBAL_S3_BUCKET}" \
    --key    "${MINIO_ROOT_USER}" > /dev/null 2>&1 || true

echo "[garage-init] Access key '${MINIO_ROOT_USER}' granted on '${GLOBAL_S3_BUCKET}'."
echo "[garage-init] Initialization complete."

# ---------------------------------------------------------------------------
# Hand off to the Garage process
# ---------------------------------------------------------------------------
wait "${GARAGE_PID}"
