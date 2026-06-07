#!/bin/sh
# PocketBase container entrypoint.
# Adds --encryptionEnv flag only when PB_ENCRYPTION_KEY is set so the server
# can start fresh (unencrypted) on first deploy if the operator hasn't set one yet.
set -e

ARGS="serve \
  --http=0.0.0.0:8090 \
  --dir=/pb/pb_data \
  --migrationsDir=/pb/pb_migrations \
  --hooksDir=/pb/pb_hooks \
  --hooksWatch=false"

if [ -n "${PB_ENCRYPTION_KEY}" ]; then
  ARGS="${ARGS} --encryptionEnv=PB_ENCRYPTION_KEY"
fi

exec /pb/pocketbase ${ARGS}
