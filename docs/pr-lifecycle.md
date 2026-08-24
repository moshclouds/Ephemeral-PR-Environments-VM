# PR lifecycle

Orchestrator: [.github/workflows/pr-workflow.yml](../.github/workflows/pr-workflow.yml). Triggers on `pull_request` to `main` (`opened`, `synchronize`, `reopened`, `closed`).

## Open / push

1. **changes** — `dorny/paths-filter` → JSON array of services.
2. **clone-db** (preview runner) — [scripts/clone_db.sh](../scripts/clone_db.sh) if the service is in the array. Dumps from `STAGING_INTERNAL_IP`, restores into:
   - `order_db_pr_<N>`
   - `inventory_db_pr_<N>`
   - `notification_db_pr_<N>`  
   Skips if the DB already exists. Frontend has no clone step.
3. **build** (`ubuntu-latest`) — `docker build` / push `.../<service>:pr-<N>`. No Vite `--build-arg`s; URLs are runtime.
4. **deploy** (preview runner) — per-service matrix. See [docs/infisical.md](infisical.md). Container name `<service>-pr-<N>`, network `preview_preview-net`, Traefik `Host(<name>.<PREVIEW_DOMAIN>)`.
5. **comment** — preview URLs for changed services. If frontend was not in the PR, the comment still links staging frontend.

Entrypoint on the container logs into Infisical and runs the app with injected env. Frontend writes `dist/config.js` from `VITE_API_*`.

## Close / merge

[pr-job-cleanup.yml](../.github/workflows/pr-job-cleanup.yml):

1. `docker stop/rm` the four possible container names
2. [scripts/cleanup_pr.sh](../scripts/cleanup_pr.sh) drops the three DB names
3. Infisical: delete webhooks for `pr-N`, then delete env by UUID
4. `docker image prune -a -f`

## Rewire without a rebuild

Edit secrets in Infisical for that `pr-N` env. Webhook receiver restarts the matching container; Infisical CLI fetches secrets again on start.
