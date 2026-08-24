# Infisical

Self-hosted on the preview VM (`https://infisical.<PREVIEW_DOMAIN>`). Used only for **PR** environments. Staging stays on disk `.env`.

## Projects

One project per service:

- order-service
- inventory-service
- notification-service
- frontend

Copy each project ID into GitHub `preview` secrets (`INFISICAL_ORDER_PROJECT_ID`, etc.).

Default envs (`dev` / `staging` / `prod`) in Infisical are unused for this flow. CI creates `pr-<number>` per project when that service is in the PR.

## Universal Auth identity

Create one machine identity, attach Universal Auth, copy client id/secret to GitHub `INFISICAL_CLIENT_ID` / `INFISICAL_CLIENT_SECRET`.

Add that identity to **all four** projects with at least:

- create / update secrets
- create / delete environments
- create / list / delete webhooks (`Create Webhooks` is a separate permission; without it, `POST /api/v1/webhooks` 403s)

## What CI writes

1. `POST /api/v1/workspace/{projectId}/environments` with slug `pr-N`
2. Import KEY=VALUE from staging VM `.env` (skips blanks, comments, empty values)
3. Override `DATABASE_URL` to preview clones:
   - order: `postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@preview-postgres:5432/order_db_pr_<N>`
   - inventory: `mysql://root:$MYSQL_ROOT_PASSWORD@preview-mysql:3306/inventory_db_pr_<N>`
   - notification: `mongodb://preview-mongo:27017/notification_db_pr_<N>?replicaSet=rs0&directConnection=true`
4. After `docker run`, delete existing webhooks for that env, then create one:
   - `projectId` (not `workspaceId`)
   - `type`: `general`
   - URL: `https://webhook.<PREVIEW_DOMAIN>/hooks/infisical?app=<service>`
   - `webhookSecretKey`: GitHub `WEBHOOK_SECRET`

Infisical does **not** send `x-webhook-secret`. It HMAC-SHA256s the JSON body and sets `x-infisical-signature`.

Webhook payload env slug is `project.environment`.

## Rewiring PRs

To point a frontend PR at a backend PR, edit the frontend Infisical env (`VITE_API_ORDER_URL`, etc.). The receiver restarts `frontend-pr-N`; [app/frontend/entrypoint.sh](../app/frontend/entrypoint.sh) rewrites `/app/dist/config.js`.

Order-service inter-service URLs cloned from staging stay as Docker names (`http://inventory-service:3001`). Those resolve on staging, not on preview. Change them in Infisical for that PR if you need PR-to-PR backend calls.

## Cleanup

On PR close, CI lists webhooks for `pr-N`, deletes them, looks up the env UUID by slug, then:

`DELETE /api/v1/projects/{projectId}/environments/{id}?hardDelete=true`

Older `DELETE .../workspace/.../environments/pr-N` is the wrong path and can 500 (`findAvailablePoliciesByEnvId`). If an env is stuck, delete it in the UI.

## Dashboard

Webhooks: **Project Settings → Webhooks**, not the secrets table.
