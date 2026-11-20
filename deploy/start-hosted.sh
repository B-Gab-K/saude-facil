#!/bin/sh
set -eu
# Free hosting has no pre-deploy hook. Prisma serializes migration deployment.
node node_modules/prisma/build/index.js migrate deploy
if [ "${SEED_DEMO:-false}" = "true" ]; then
  node dist/cli/seed-demo.js
elif [ "${SEED_DEMO:-false}" != "false" ]; then
  printf '%s\n' 'SEED_DEMO deve ser true ou false.' >&2
  exit 1
fi
exec node dist/main.js
