# CI/CD Workflows Architecture

This document explains the flow of our GitHub Actions CI/CD pipelines when a Pull Request is opened or closed in this multi-repo, Infisical-driven architecture.

## 1. On Pull Request Open/Synchronize

When a developer opens or updates a Pull Request (e.g., PR #55 in the `order-service`), the `pr-deploy.yml` GitHub Action triggers.

### The Pipeline Steps:

1. **Build & Push Docker Image:**
   The pipeline builds the Docker image for the microservice and pushes it to your container registry (e.g., Google Artifact Registry, AWS ECR, or Docker Hub) tagged with the PR number (e.g., `registry/order-service:pr-55`).

2. **Clone Database (For Backend Services):**
   The action SSHes into the Preview VM and runs the `clone_db.sh` script. This script connects to the staging database and rapidly clones the schema and data into a new, isolated database named `order_db_pr_55`.

3. **Create Infisical Environment:**
   Using the Infisical CLI (or REST API), the pipeline creates an ephemeral environment specifically for this PR, cloning the base variables from staging.
   ```bash
   infisical environments create --name pr-55 --slug pr-55
   ```

4. **Inject Dynamic DB URL into Infisical:**
   The pipeline updates the `DATABASE_URL` secret inside the new `pr-55` environment to point to the freshly cloned DB from Step 2.

5. **Register Infisical Webhook:**
   The pipeline makes an API call to Infisical to attach a webhook to the `pr-55` environment. 
   Notice the `?app=order-service` query parameter—this tells our custom Node.js receiver on the VM exactly which container to restart if secrets change.
   ```bash
   curl --request POST \
     --url https://app.infisical.com/api/v1/webhooks \
     --header "Authorization: Bearer $INFISICAL_TOKEN" \
     --header "Content-Type: application/json" \
     --data '{
       "workspaceId": "your-project-id",
       "environment": "pr-55",
       "secretPath": "/",
       "webhookUrl": "https://webhook.preview.yourdomain.com/hooks/infisical?app=order-service",
       "webhookSecretKey": "super-secret-token-123"
   }'
   ```

6. **Deploy Container to Preview VM:**
   The pipeline SSHes into the Preview VM and starts the Docker container. 
   It wraps the `docker run` command with the `infisical run` CLI, which securely injects the secrets at runtime. It also adds Traefik labels so the reverse proxy can auto-route the URL.
   ```bash
   infisical run --env=pr-55 -- docker run -d \
     --name order-service-pr-55 \
     --label "traefik.enable=true" \
     --label "traefik.http.routers.order-pr-55.rule=Host('order-pr-55.preview.yourdomain.com')" \
     --label "traefik.http.routers.order-pr-55.tls.certresolver=myresolver" \
     your-registry/order-service:pr-55
   ```

7. **PR Comment:**
   Finally, the pipeline uses the GitHub API to leave a comment on the PR containing the dynamically generated preview link (e.g., `https://order-pr-55.preview.yourdomain.com`).

---

## 2. On Pull Request Closed/Merged

When the PR is successfully merged or closed without merging, we must tear down the ephemeral resources so they don't consume storage or clutter the Infisical dashboard.

The `pr-cleanup.yml` GitHub Action triggers:

1. **Stop & Remove Container:**
   The action SSHes into the VM and runs:
   ```bash
   docker stop order-service-pr-55
   docker rm order-service-pr-55
   ```

2. **Drop Database:**
   The action runs the `cleanup_db.sh` script to delete the `order_db_pr_55` database clone.

3. **Delete Infisical Environment:**
   The pipeline calls the Infisical CLI to delete the `pr-55` environment.
   ```bash
   infisical environments delete --slug pr-55
   ```
   *(Note: Deleting the environment automatically cleans up the webhook we attached to it in Step 5 of the deploy workflow).*

