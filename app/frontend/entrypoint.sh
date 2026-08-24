#!/bin/sh
set -e

if [ -n "$INFISICAL_UNIVERSAL_AUTH_CLIENT_ID" ]; then
  export INFISICAL_TOKEN
  INFISICAL_TOKEN=$(infisical login \
    --method=universal-auth \
    --client-id="$INFISICAL_UNIVERSAL_AUTH_CLIENT_ID" \
    --client-secret="$INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET" \
    --domain="$INFISICAL_API_URL" \
    --plain --silent)

  eval "$(infisical export \
    --projectId="$INFISICAL_PROJECT_ID" \
    --env="$INFISICAL_ENV" \
    --domain="$INFISICAL_API_URL" \
    --format=dotenv)"
fi

cat > /app/dist/config.js << EOF
window.__env__ = {
  ORDER_URL: "${VITE_API_ORDER_URL:-http://localhost:3000}",
  INVENTORY_URL: "${VITE_API_INVENTORY_URL:-http://localhost:3001}",
  NOTIFICATION_URL: "${VITE_API_NOTIFICATION_URL:-http://localhost:3002}"
};
EOF

exec serve -s dist -l 80
