#!/bin/bash
set -e

SERVICE_NAME=$1
PR_NUMBER=$2

if [ -z "$SERVICE_NAME" ] || [ -z "$PR_NUMBER" ]; then
  echo "Usage: $0 <SERVICE_NAME> <PR_NUMBER>"
  exit 1
fi

echo "Cleaning up database for $SERVICE_NAME (PR #$PR_NUMBER) on Preview VM..."

case "$SERVICE_NAME" in
  order-service)
    TARGET_DB="order_db_pr_${PR_NUMBER}"
    echo "Dropping Postgres DB: $TARGET_DB"
    echo "Force-disconnecting active sessions from $TARGET_DB..."
    docker exec -i preview-postgres psql -U postgres -d postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '${TARGET_DB}' AND pid <> pg_backend_pid();" || true
    docker exec -i preview-postgres psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS ${TARGET_DB};" || true
    echo "Successfully cleaned up Postgres DB"
    ;;
  inventory-service)
    TARGET_DB="inventory_db_pr_${PR_NUMBER}"
    echo "Dropping MySQL DB: $TARGET_DB"
    docker exec -i preview-mysql mysql -uroot -pmysqlroot -e "DROP DATABASE IF EXISTS ${TARGET_DB};" || true
    echo "Successfully cleaned up MySQL DB"
    ;;
  notification-service)
    TARGET_DB="notification_db_pr_${PR_NUMBER}"
    echo "Dropping MongoDB Database: $TARGET_DB"
    docker exec -i preview-mongo mongosh --eval "db.getSiblingDB('${TARGET_DB}').dropDatabase()" || true
    echo "Successfully cleaned up MongoDB"
    ;;
  *)
    echo "Service $SERVICE_NAME does not require database cleanup or is unrecognized."
    ;;
esac
