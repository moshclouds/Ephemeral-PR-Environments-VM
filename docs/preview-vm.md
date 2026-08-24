# Preview VM

The preview VM runs PR containers, Infisical, Traefik, and the three databases used for clones. Compose file: [infra/preview/docker-compose.yml](../infra/preview/docker-compose.yml).

Typical checkout path on the VM: `~/Ephemeral-PR-Environments`.

## DNS

Wildcard DNS and Traefik (HTTP-01, labels, `preview_preview-net`): [traefik.md](traefik.md).

Example URLs:

- `https://order-service-pr-5.ephemeral-poc.run.place`
- `https://infisical.ephemeral-poc.run.place`
- `https://webhook.ephemeral-poc.run.place`

## Compose services

| Container | Role |
|---|---|
| Traefik | HTTP/HTTPS, Docker labels, ACME |
| `preview-postgres` | Infisical DB + `order_db_pr_<N>` clones |
| `preview-mysql` | `inventory_db_pr_<N>` clones |
| `preview-mongo` | `notification_db_pr_<N>` clones (replica set) |
| Infisical + Redis | Secrets for PR envs |
| `preview-webhook-receiver` | HMAC-verify Infisical, `docker restart <service>-pr-<N>` |

Copy [infra/preview/.env.sample](../infra/preview/.env.sample) to `infra/preview/.env` on the VM. Do not rotate `ENCRYPTION_KEY` / `AUTH_SECRET` after Infisical has data — it will fail to decrypt.

`WEBHOOK_SECRET` in this file must match GitHub environment secret `WEBHOOK_SECRET`. Infisical signs payloads with that key (`x-infisical-signature`).

Deploy uses `source ~/Ephemeral-PR-Environments/infra/preview/.env` for `POSTGRES_USER`, `POSTGRES_PASSWORD`, `MYSQL_ROOT_PASSWORD` when writing PR `DATABASE_URL`s.

## GitHub runner

Install the Actions runner on this VM with labels `self-hosted` and `preview`. PR deploy / clone-db / cleanup jobs use `runs-on: [self-hosted, preview]`.

Install the Infisical CLI on the runner (used by deploy and cleanup).

## Webhook receiver

Source: [infra/preview/webhook-receiver](../infra/preview/webhook-receiver).

- `POST /hooks/infisical?app=<service>`
- Auth: HMAC-SHA256 of the raw body, header `x-infisical-signature` (`t=<ts>;<hex>`)
- Body env slug: `project.environment` (e.g. `pr-5`)
- Restarts `order-service-pr-5` etc.
- Missing container → 200 skip (avoids Infisical retry storms during first secret writes)
- Duplicate events within 15s → 200 debounce

Rebuild after code changes:

```bash
cd ~/Ephemeral-PR-Environments/infra/preview
docker compose up -d --build webhook-receiver
```

## SSH to staging (for `.env` clone)

The preview runner SSHes to `STAGING_SSH_USER@STAGING_INTERNAL_IP` with `STAGING_SSH_PRIVATE_KEY` and cats `~/Ephemeral-PR-Environments/app/<service>/.env`.

Use the same key you already use to log into staging. Username is the Linux user (e.g. `moshdev2213`), not `ubuntu` unless that is the account.

## Disk

Cleanup runs `docker image prune -a -f` so unused PR images are dropped. Keep an eye on volume usage for Postgres/MySQL/Mongo clones.
