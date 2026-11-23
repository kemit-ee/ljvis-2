#!/bin/sh
# One-shot init for TIM (dev / CI). Runs as root, exits 0 when done.
#  1. waits for the TARA-Mock self-signed CA and copies it to the shared key
#     volume, where TIM reads it via SSL_CERT_FILE;
#  2. generates the JWT RSA key if missing;
#  3. hands both over to the distroless nonroot user (UID 65532).
set -e

TARA_CA=${TARA_MOCK_CA_PATH:-/tara-mock-vault/rootCA.pem}
KEYDIR=/opt/tim/keys
KEY=$KEYDIR/jwt-private.pem
MAX_WAIT=60
WAITED=0

echo "[tim-init] Waiting for TARA-Mock CA certificate at ${TARA_CA}..."
until [ -f "$TARA_CA" ]; do
    if [ "$WAITED" -ge "$MAX_WAIT" ]; then
        echo "[tim-init] ERROR: TARA-Mock CA not found after ${MAX_WAIT}s — aborting."
        exit 1
    fi
    sleep 1
    WAITED=$((WAITED + 1))
done
cp "$TARA_CA" "$KEYDIR/tara-mock-ca.pem"

if [ ! -f "$KEY" ]; then
    echo "[tim-init] Generating RSA private key at ${KEY}..."
    openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$KEY" 2>/dev/null
fi

chown 65532:65532 "$KEYDIR" "$KEY" "$KEYDIR/tara-mock-ca.pem"
chmod 700 "$KEYDIR"
chmod 600 "$KEY"
chmod 644 "$KEYDIR/tara-mock-ca.pem"
echo "[tim-init] Done."
