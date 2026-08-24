# Ephemeral PR Environments

One repo, two VMs. Staging is a shared stack with local `.env` files. Each GitHub PR that touches `app/*` gets containers, cloned DBs, and Infisical envs on the preview VM.

```
PR opened
  → detect changed services
  → clone staging DBs onto preview (Postgres / MySQL / Mongo)
  → build images, push to Artifact Registry
  → SSH-read staging .env, write Infisical env `pr-N`, override DATABASE_URL
  → docker run with Infisical machine-identity env vars
  → entrypoint: infisical run (preview) or compose env_file (staging)
  → webhook on secret change → docker restart
PR closed
  → stop containers, drop DBs, delete Infisical webhooks + env
```

## Stack

| Piece | What |
|---|---|
| Apps | React/Vite frontend, NestJS order / inventory / notification |
| Staging VM | Docker Compose, Nginx + Certbot, DBs, `:staging` images, `env_file` |
| Preview VM | Traefik, self-hosted Infisical, webhook receiver, DBs for PR clones |
| CI | GitHub Actions; self-hosted runners labeled `staging` and `preview` |

## Docs

| Doc | Contents |
|---|---|
| [docs/preview-vm.md](docs/preview-vm.md) | Preview VM: Infisical, DBs, webhook receiver, runner |
| [docs/traefik.md](docs/traefik.md) | Traefik, wildcard DNS, ACME, compose + PR labels |
| [docs/staging-vm.md](docs/staging-vm.md) | Staging VM: compose, Nginx, `.env` files, runner |
| [docs/infisical.md](docs/infisical.md) | Four projects, Universal Auth, webhooks, PR envs |
| [docs/github.md](docs/github.md) | GitHub environments and secrets |
| [docs/pr-lifecycle.md](docs/pr-lifecycle.md) | What CI does on open / sync / close |

## Local

Each service has its own `.env` under `app/<service>/`. Backend images skip Infisical when `INFISICAL_UNIVERSAL_AUTH_CLIENT_ID` is unset and start from process env (same as staging). Frontend reads `window.__env__` from `/config.js` at runtime, then Vite `import.meta.env`.
