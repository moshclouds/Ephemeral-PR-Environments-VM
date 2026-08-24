# GitHub

Two environments: `staging` and `preview`. Workflows pin `environment:` so secrets stay split.

## `preview` secrets

| Name | Used for |
|---|---|
| `INFISICAL_CLIENT_ID` / `INFISICAL_CLIENT_SECRET` | Universal Auth |
| `INFISICAL_ORDER_PROJECT_ID` | order Infisical project |
| `INFISICAL_INVENTORY_PROJECT_ID` | inventory |
| `INFISICAL_NOTIFICATION_PROJECT_ID` | notification |
| `INFISICAL_FRONTEND_PROJECT_ID` | frontend |
| `PREVIEW_DOMAIN` | host suffix, e.g. `ephemeral-poc.run.place` |
| `WEBHOOK_SECRET` | Infisical webhook HMAC; same as `infra/preview/.env` |
| `STAGING_INTERNAL_IP` | SSH + `pg_dump`/`mysqldump`/`mongodump` source |
| `STAGING_SSH_USER` | Linux user on staging |
| `STAGING_SSH_PRIVATE_KEY` | Full private key PEM |
| `GCP_AR_REPO` | Artifact Registry prefix |
| `GCP_SA_KEY` | Build job (ubuntu-latest) Docker push |

Remove leftover `INFISICAL_PROJECT_ID` if it still exists.

## `staging` secrets

Whatever staging workflows already use (`GCP_SA_KEY`, `GCP_AR_REPO`, Vite URLs if any leftover). Staging runtime secrets live on the VM `.env` files, not Infisical.

## Runners

| Labels | Jobs |
|---|---|
| `[self-hosted, preview]` | clone-db, deploy, cleanup |
| `[self-hosted, staging]` | staging compose deploy |
| `ubuntu-latest` | path filter, image build/push, PR comment |

## Path filter

[pr-job-changes.yml](../.github/workflows/pr-job-changes.yml) only lists services under `app/<name>/**`. A PR that only changes `.github/` or `infra/` deploys nothing unless you also touch an app tree.
