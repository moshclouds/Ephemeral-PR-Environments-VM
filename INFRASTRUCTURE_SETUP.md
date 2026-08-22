# Infrastructure Setup Guide

This guide walks you through setting up the core infrastructure required for the Ephemeral PR Environments architecture.

## Prerequisites
- A domain name (managed by Cloudflare recommended).
- A Virtual Machine (Google Compute Engine, AWS EC2, or DigitalOcean Droplet).
- An Infisical Cloud account (or self-hosted instance).

---

## Step 1: Cloudflare DNS Setup

To allow dynamic routing to ephemeral PR URLs (e.g., `order-pr-55.preview.yourdomain.com`), you need a wildcard DNS record.

1. Go to your Cloudflare Dashboard -> **DNS**.
2. Add a new record:
   - **Type:** `A`
   - **Name:** `*.preview`
   - **IPv4 address:** `[Your Preview VM Public IP]`
   - **Proxy status:** **DNS Only (Grey Cloud)** ⚠️
3. **Important Note on Proxy Status:** Cloudflare's free Universal SSL only covers one level of subdomains (e.g., `*.yourdomain.com`). It does not cover `*.*.yourdomain.com`. By setting it to "DNS Only", we pass the raw traffic to our VM, where Traefik will automatically handle SSL generation via Let's Encrypt.

---

## Step 2: Preview VM & Traefik Setup

Your Preview VM needs Docker installed and a running Traefik instance to handle reverse proxying.

1. SSH into your Preview VM.
2. Install Docker and Docker Compose.
3. Create a Traefik setup directory:
   ```bash
   mkdir -p /opt/traefik && cd /opt/traefik
   touch acme.json && chmod 600 acme.json
   ```
4. Create a `docker-compose.yml` for Traefik:
   ```yaml
   version: '3'

   services:
     traefik:
       image: traefik:v3.7
       command:
         - "--api.insecure=true"
         - "--providers.docker=true"
         - "--providers.docker.exposedbydefault=false"
         - "--entrypoints.web.address=:80"
         - "--entrypoints.websecure.address=:443"
         - "--certificatesresolvers.myresolver.acme.tlschallenge=true"
         - "--certificatesresolvers.myresolver.acme.email=your-email@example.com"
         - "--certificatesresolvers.myresolver.acme.storage=/letsencrypt/acme.json"
       ports:
         - "80:80"
         - "443:443"
       volumes:
         - "/var/run/docker.sock:/var/run/docker.sock:ro"
         - "./acme.json:/letsencrypt/acme.json"
       restart: unless-stopped
   ```
5. Start Traefik: `docker-compose up -d`

Whenever your CI/CD pipeline starts a PR container on this VM, it simply adds labels to tell Traefik where to route traffic (e.g., `--label "traefik.http.routers.frontend-pr-55.rule=Host('frontend-pr-55.preview.yourdomain.com')"`).

---

## Step 3: Infisical Setup

Infisical will act as the dynamic secret injection engine for our PR containers.

1. Create a Project in Infisical for each microservice (e.g., `order-service`, `frontend`).
2. Inside each project, navigate to **Machine Identities** (or Service Tokens).
3. Generate a Machine Token with permissions to read/create/delete environments.
4. Save this token as a GitHub Secret (`INFISICAL_TOKEN`) in the respective microservice repository.

---

## Step 4: Custom Node.js Webhook Receiver

To allow developers to update secrets in Infisical (like pointing a frontend PR to a backend PR) and have the containers restart instantly, we run a lightweight Node.js webhook receiver on the Preview VM.

### 1. Setup the Script
SSH into your Preview VM and create the webhook receiver script:
```bash
mkdir -p /opt/webhook-receiver && cd /opt/webhook-receiver
npm init -y
npm install express
nano server.js
```

### 2. The Code (`server.js`)
Paste the following code into `server.js`:

```javascript
const express = require('express');
const { exec } = require('child_process');

const app = express();
app.use(express.json());

// Set this to a secure random string and use it when configuring the webhook in Infisical
const INFISICAL_WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'super-secret-token-123';

app.post('/hooks/infisical', (req, res) => {
    // 1. Verify the request came from Infisical
    const authHeader = req.headers['x-webhook-secret'];
    if (authHeader !== INFISICAL_WEBHOOK_SECRET) {
        console.warn('Unauthorized webhook attempt');
        return res.status(401).send('Unauthorized');
    }

    // 2. Grab the app name from the URL query parameter (e.g., ?app=order-service)
    const appName = req.query.app;
    
    // 3. Grab the environment from the Infisical JSON body payload
    const environment = req.body.environment; // e.g., "pr-55"

    if (!appName || !environment) {
        return res.status(400).send('Missing app name or environment payload');
    }

    // 4. Sanitize inputs to prevent Command Injection
    const safeRegex = /^[a-zA-Z0-9-]+$/;
    if (!safeRegex.test(environment) || !safeRegex.test(appName)) {
        console.error(`Invalid characters in payload: ${appName}-${environment}`);
        return res.status(400).send('Invalid characters');
    }

    // 5. Construct the Docker container name
    const containerName = `${appName}-${environment}`; // e.g., "order-service-pr-55"

    console.log(`Received update for ${containerName}. Initiating restart...`);

    // 6. Execute the Docker restart command
    exec(`docker restart ${containerName}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Failed to restart ${containerName}:`, stderr);
            return res.status(500).json({ status: 'error', message: 'Failed to restart container' });
        }
        
        console.log(`Successfully restarted ${containerName}`);
        return res.status(200).json({ status: 'success', message: `Restarted ${containerName}` });
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Webhook receiver listening on port ${PORT}`);
});
```

### 3. Run with PM2
To keep the script running permanently in the background:
```bash
sudo npm install -g pm2
WEBHOOK_SECRET=your_secure_token pm2 start server.js --name "infisical-webhook"
pm2 save
pm2 startup
```

Now, your VM is fully prepared to receive dynamic deployments from GitHub Actions and instant restart webhooks from Infisical!

