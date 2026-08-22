# Ephemeral PR Environments POC

The **Ephemeral PR Environments** Proof of Concept (POC) repository demonstrates a highly advanced, multi-repo compatible approach to spinning up complete microservice environments dynamically for every GitHub Pull Request.

## 🌟 The Vision: True Isolated Testing

The primary goal of this architecture is to provide **Isolated Testing** for every single pull request, inspired by the modern "Preview Branches" paradigm. 

When a developer works on a feature, they shouldn't have to share a staging environment where their disruptive database migrations or experimental code might block other engineers. They need a complete, sandboxed environment tailored exactly to their git branch. 

This POC achieves true isolation using a **Container-Native, Env-Var-Driven Architecture**:
1. **Dedicated Preview VM:** All ephemeral PR containers run on a single, cost-effective Google Compute Engine VM.
2. **Dynamic Routing (Traefik):** Traffic is instantly routed to the correct PR container (e.g., `order-pr-55.preview.domain.com`) using Traefik and Docker labels.
3. **Secret & Environment Management (Infisical):** No hardcoded `.env` files. Every PR dynamically creates an ephemeral environment in Infisical. Services discover their dependencies entirely through dynamically injected environment variables.
4. **Instant Cross-Service Rewiring (Webhooks):** A custom Node.js webhook listener on the VM allows developers to instantly rewire microservices from the Infisical dashboard, triggering sub-second container restarts to pick up new targets.

## 🏗️ Architecture & Technologies

- **Frontend:** React + Vite + TailwindCSS
- **Backend Services:** NestJS + Prisma ORM
- **Databases:** PostgreSQL, MySQL, MongoDB
- **Infrastructure:** Google Compute Engine (Preview VM), Traefik (Reverse Proxy & SSL), Cloudflare (DNS)
- **Secrets:** Infisical
- **CI/CD:** GitHub Actions

---

## ✨ Key Features & Innovations

### 1. Multi-Repo, Env-Var Driven Communication
Unlike older architectures that rely on in-app HTTP header propagation (interceptors), this architecture keeps application code 100% clean. Microservices communicate strictly via standard environment variables (e.g., `FRONTEND_URL`, `ORDER_SERVICE_URL`). 

When a PR is opened, CI/CD creates an isolated Infisical environment (e.g., `pr-55`). The container boots on the Preview VM using the Infisical CLI, securely pulling its variables into process memory. Unmodified dependencies automatically fall back to staging URLs.

### 2. Instant Cross-Service Testing (Custom Webhook Receiver)
Testing a frontend PR against a backend PR requires changing the frontend's environment variable to point to the new backend URL.

Instead of waiting for a slow CI/CD pipeline to rebuild and restart containers, we use a **Custom Node.js Webhook Receiver**.
1. A developer opens the Infisical dashboard and changes `ORDER_SERVICE_URL` in the frontend's `pr-12` environment.
2. Infisical fires a webhook to the Preview VM.
3. The custom Node.js receiver instantly intercepts the webhook and runs `docker restart frontend-pr-12`.
4. The container restarts in milliseconds, pulling the new secrets and successfully wiring the two isolated PRs together.

### 3. True Database Isolation (Zero Provisioning)
When a backend service changes, we need an isolated database to run schema migrations and tests without breaking the staging environment.
Our GitHub Actions pipeline connects to the Preview VM and executes a highly optimized, idempotent script. This script dynamically clones the staging database schema and data into a temporary PR namespace (e.g., `order_db_pr_55`) in milliseconds, without provisioning any new hardware.

### 4. Dynamic Reverse Proxy (Traefik)
We use Traefik on the Preview VM to handle routing and SSL. When GitHub Actions deploys a PR container, it attaches a Docker label like `traefik.http.routers.order-pr-55.rule=Host('order-pr-55.preview.yourdomain.com')`. Traefik instantly detects the new container, wires up the route, and automatically fetches a free Let's Encrypt SSL certificate.

### 5. Automated Teardown
When a Pull Request is merged or closed, a cleanup GitHub Action automatically:
1. Stops and removes the ephemeral Docker containers from the VM.
2. Drops the isolated PR databases to free up storage space.
3. Deletes the ephemeral `pr-*` environment in Infisical.

---

## 🚀 Getting Started

If you want to recreate this infrastructure from scratch, we have created comprehensive documentation:

👉 **[Read the Infrastructure Setup Guide](INFRASTRUCTURE_SETUP.md)** - Details on setting up the VM, Traefik, Cloudflare, Infisical, and the Webhook Receiver.

👉 **[Read the CI/CD Workflows Architecture](WORKFLOWS.md)** - Explains how GitHub Actions orchestrates container deployments and Infisical API calls.

