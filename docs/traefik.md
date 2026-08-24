# Traefik (preview VM)

Staging uses Nginx. Preview uses Traefik so each PR container can get a host + TLS cert from Docker labels — no nginx reload.

Config lives in [infra/preview/docker-compose.yml](../infra/preview/docker-compose.yml) (`traefik` service). Image: `traefik:v3.7`.

## DNS

Wildcard A record → preview VM public IP, **DNS only** (grey cloud on Cloudflare).

HTTP-01 ACME hits `http://<host>/.well-known/acme-challenge/...` on port 80. If Cloudflare proxies that, issuance fails.

This POC: `*.ephemeral-poc.run.place` covers:

- `order-service-pr-5.ephemeral-poc.run.place`
- `infisical.ephemeral-poc.run.place`
- `webhook.ephemeral-poc.run.place`

`PREVIEW_DOMAIN` in GitHub is the suffix (`ephemeral-poc.run.place`). Deploy builds `Host(<service>-pr-<N>.<PREVIEW_DOMAIN>)`.

## What Traefik is told to do

| Flag | Meaning |
|---|---|
| `--providers.docker=true` | Watch Docker for labels |
| `--providers.docker.exposedbydefault=false` | Ignore containers unless `traefik.enable=true` |
| `--entrypoints.web.address=:80` | HTTP |
| redirect web → websecure | All HTTP becomes HTTPS |
| `--entrypoints.websecure.address=:443` | HTTPS |
| `--certificatesresolvers.myresolver.acme.httpchallenge` | Let's Encrypt via port 80 |
| `--certificatesresolvers.myresolver.acme.httpchallenge.entrypoint=web` | Challenge on `web` |
| `--certificatesresolvers.myresolver.acme.email` | ACME account email (edit in compose) |
| `--certificatesresolvers.myresolver.acme.storage=/letsencrypt/acme.json` | Cert store (volume `letsencrypt_data`) |
| docker.sock read-only | Discover containers |
| network `preview-net` | Same bridge as Infisical, webhook, PR apps |

`--api.insecure=true` is on. Dashboard is not published on the host (`ports` are only 80/443). Do not add `8080:8080` on a public VM.

## Static hosts (compose labels)

Infisical and the webhook receiver are labeled in compose:

```
traefik.enable=true
traefik.http.routers.infisical.rule=Host(`infisical.ephemeral-poc.run.place`)
traefik.http.routers.infisical.tls.certresolver=myresolver
traefik.http.services.infisical.loadbalancer.server.port=8080

traefik.http.routers.webhook.rule=Host(`webhook.ephemeral-poc.run.place`)
traefik.http.routers.webhook.tls.certresolver=myresolver
traefik.http.services.webhook.loadbalancer.server.port=3000
```

Change those `Host(...)` strings if the domain changes, then recreate those two services.

## PR containers (CI labels)

[pr-job-deploy.yml](../.github/workflows/pr-job-deploy.yml) attaches:

```
traefik.enable=true
traefik.http.routers.<service>-pr-<N>.rule=Host(`<service>-pr-<N>.<PREVIEW_DOMAIN>`)
traefik.http.routers.<service>-pr-<N>.tls.certresolver=myresolver
```

`--network preview_preview-net` is the Compose project network (`<directory>_<network>` from `infra/preview` + `preview-net`). Traefik only routes containers on a network it is attached to. If deploy uses the wrong network name, the container is up but Traefik never sees it.

No `loadbalancer.server.port` on PR apps: Traefik uses the image `EXPOSE` (3000 / 3001 / 3002 / 80).

## Bring-up

On the preview VM, after `.env` exists:

```bash
cd ~/Ephemeral-PR-Environments/infra/preview
docker compose up -d traefik
docker compose ps traefik
docker compose logs -f traefik
```

First request to a new Host triggers ACME. Check logs for `certificate obtained` vs rate-limit / challenge errors.

## Checklist when HTTPS fails

1. DNS A for that hostname (or wildcard) points at this VM, not proxied
2. 80 and 443 open on the GCP firewall
3. Container is on `preview_preview-net`
4. Labels match the URL you typed (no trailing dot)
5. ACME email in compose is valid enough for Let's Encrypt
