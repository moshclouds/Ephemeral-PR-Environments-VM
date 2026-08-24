# Staging VM

Staging is the long-lived stack. It does **not** use Infisical. Compose: [infra/staging/docker-compose.yml](../infra/staging/docker-compose.yml). Nginx + Certbot terminate public HTTPS.

Typical checkout: `~/Ephemeral-PR-Environments`.

## DNS

A records (this POC) on the staging VM IP:

- `order.staging.ephemeral-poc.run.place`
- `inventory.staging.ephemeral-poc.run.place`
- `notification.staging.ephemeral-poc.run.place`
- `frontend.staging.ephemeral-poc.run.place`

Nginx `server_name` values live in [infra/staging/nginx/default.conf](../infra/staging/nginx/default.conf). Upstreams are Docker Compose names (`order-service:3000`, `frontend:80`, …). If `frontend` is crash-looping, Nginx logs `frontend could not be resolved` and returns 502.

## App `.env` on the VM

Compose `env_file` paths are relative to this repo on disk. They are **not** the local-dev files in git unless you copy them.

Example (order — Docker DNS names, not localhost):

```
PORT=3000
DATABASE_URL=postgresql://postgres:stagingpassword@postgres-db:5432/order_db
INVENTORY_SERVICE_URL=http://inventory-service:3001
NOTIFICATION_SERVICE_URL=http://notification-service:3002
```

Frontend (public URLs; baked into `config.js` at container start):

```
VITE_API_ORDER_URL=https://order.staging.ephemeral-poc.run.place
VITE_API_INVENTORY_URL=https://inventory.staging.ephemeral-poc.run.place
VITE_API_NOTIFICATION_URL=https://notification.staging.ephemeral-poc.run.place
```

PR deploy SSHs here and imports these files into Infisical, then overrides `DATABASE_URL` to the preview clone.

## Dual-mode images

The same Docker image runs on staging and preview. [entrypoint.sh](../app/order-service/entrypoint.sh) (and inventory / notification / frontend):

- If `INFISICAL_UNIVERSAL_AUTH_CLIENT_ID` is set → login + `infisical run`
- Else → start from compose `env_file` (`prisma migrate` + `start:prod`, or `serve` for frontend)

Do not point staging compose at Infisical client IDs.

## GitHub runner

Runner labels: `self-hosted`, `staging`. Staging deploy workflows rsync the repo to `~/Ephemeral-PR-Environments/` then `docker compose pull && up -d` under `infra/staging`.

Images: `${GCP_AR_REPO}/<service>:staging`.

## Infra env

[infra/.env](../infra/.env) (or whatever compose loads next to staging compose) holds DB bootstrap vars (`POSTGRES_*`, `MYSQL_*`, `GCP_AR_REPO`). Keep that in sync with the app `DATABASE_URL`s on disk.
