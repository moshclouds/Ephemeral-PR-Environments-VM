#!/bin/bash
set -e

SERVICE_NAME=$1
PR_NUMBER=$2

if [ -z "$SERVICE_NAME" ] || [ -z "$PR_NUMBER" ]; then
  echo "Usage: $0 <SERVICE_NAME> <PR_NUMBER>"
  exit 1
fi

if [ -z "$STAGING_INTERNAL_IP" ]; then
  echo "Error: STAGING_INTERNAL_IP environment variable is missing."
  exit 1
fi

echo "Cloning database for $SERVICE_NAME (PR #$PR_NUMBER) from Staging ($STAGING_INTERNAL_IP) to Preview VM..."

case "$SERVICE_NAME" in
  order-service)
    TARGET_DB="order_db_pr_${PR_NUMBER}"
    
    # 1. Check if it already exists on the Preview VM
    DB_EXISTS=$(docker exec -i preview-postgres psql -U ${POSTGRES_USER:-postgres} -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${TARGET_DB}'" || true)
    
    if [ "$DB_EXISTS" == "1" ]; then
      echo "Postgres DB $TARGET_DB already exists. Skipping clone."
    else
      echo "Creating Postgres DB: $TARGET_DB on Preview VM"
      docker exec -i preview-postgres psql -U ${POSTGRES_USER:-postgres} -d postgres -c "CREATE DATABASE ${TARGET_DB};"
      
      echo "Pulling data over the network from Staging VM..."
      # Use PGPASSWORD so pg_dump doesn't prompt
      export PGPASSWORD="${STAGING_POSTGRES_PASSWORD:-stagingpassword}"
      
      # Pull from Staging IP -> Pipe into local Preview Postgres
      docker run --rm -e PGPASSWORD=$PGPASSWORD postgres:15-alpine \
        pg_dump -h $STAGING_INTERNAL_IP -U postgres order_db \
        | docker exec -i preview-postgres psql -U ${POSTGRES_USER:-postgres} -d ${TARGET_DB}
        
      echo "Successfully cloned Postgres DB to ${TARGET_DB}"
    fi
    ;;
    
  inventory-service)
    TARGET_DB="inventory_db_pr_${PR_NUMBER}"
    
    DB_EXISTS=$(docker exec -i preview-mysql mysql -u${MYSQL_USER:-root} -p${MYSQL_PASSWORD:-mysqlroot} -se "SELECT EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = '${TARGET_DB}')" || true)
    
    if [ "$DB_EXISTS" == "1" ]; then
      echo "MySQL DB $TARGET_DB already exists. Skipping clone."
    else
      echo "Creating MySQL DB: $TARGET_DB on Preview VM"
      docker exec -i preview-mysql mysql -u${MYSQL_USER:-root} -p${MYSQL_PASSWORD:-mysqlroot} -e "CREATE DATABASE ${TARGET_DB};"
      
      echo "Pulling data over the network from Staging VM..."
      
      # Pull from Staging IP -> Pipe into local Preview MySQL
      docker run --rm mysql:8.0 \
        mysqldump -h $STAGING_INTERNAL_IP -uroot -p${STAGING_MYSQL_PASSWORD:-stagingmysqlroot} inventory_db \
        | docker exec -i preview-mysql mysql -u${MYSQL_USER:-root} -p${MYSQL_PASSWORD:-mysqlroot} $TARGET_DB
        
      echo "Successfully cloned MySQL DB to ${TARGET_DB}"
    fi
    ;;
    
  notification-service)
    TARGET_DB="notification_db_pr_${PR_NUMBER}"
    
    DB_EXISTS=$(docker exec -i preview-mongo mongosh --quiet --eval "db.getMongo().getDBNames().indexOf('${TARGET_DB}') >= 0" || true)
    
    if [[ "$DB_EXISTS" == *"true"* ]]; then
      echo "MongoDB Database $TARGET_DB already exists. Skipping clone."
    else
      echo "Pulling data over the network from Staging VM directly into $TARGET_DB..."
      
      # Pull from Staging IP -> Pipe into local Preview Mongo
      docker run --rm mongo:6-jammy \
        mongodump --host $STAGING_INTERNAL_IP --port 27017 --db=notification_db --archive \
        | docker exec -i preview-mongo mongorestore --archive --nsFrom="notification_db.*" --nsTo="${TARGET_DB}.*"
        
      echo "Successfully cloned MongoDB to ${TARGET_DB}"
    fi
    ;;
    
  *)
    echo "Service $SERVICE_NAME does not require database cloning or is unrecognized."
    ;;
esac
