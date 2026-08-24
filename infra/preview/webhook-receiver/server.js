const crypto = require('crypto');
const express = require('express');
const { exec } = require('child_process');

const app = express();

const INFISICAL_WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'super-secret-token-123';

app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));

function verifyInfisicalSignature(req) {
  const header = req.headers['x-infisical-signature'];
  if (!header || typeof header !== 'string') return false;

  const [, signature] = header.split(';');
  if (!signature) return false;

  const expected = crypto
    .createHmac('sha256', INFISICAL_WEBHOOK_SECRET)
    .update(req.rawBody || '')
    .digest('hex');

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

app.post('/hooks/infisical', (req, res) => {
  if (!verifyInfisicalSignature(req)) {
    console.warn('Unauthorized webhook attempt');
    return res.status(401).send('Unauthorized');
  }

  const appName = req.query.app;
  const environment = req.body?.project?.environment || req.body?.environment;

  if (!appName || !environment) {
    return res.status(400).send('Missing app name or environment payload');
  }

  const safeRegex = /^[a-zA-Z0-9-]+$/;
  if (!safeRegex.test(environment) || !safeRegex.test(appName)) {
    console.error(`Invalid characters in payload: ${appName}-${environment}`);
    return res.status(400).send('Invalid characters');
  }

  const containerName = `${appName}-${environment}`;
  console.log(`Received update for ${containerName}. Initiating restart...`);

  exec(`docker restart ${containerName}`, (error, stdout, stderr) => {
    if (error) {
      const detail = String(stderr || error.message || '');
      // Deploy sets secrets before/while the container is (re)created.
      // Return 200 so Infisical does not retry-storm "No such container".
      if (/No such container/i.test(detail)) {
        console.warn(`Skipped restart — container not ready yet: ${containerName}`);
        return res.status(200).json({
          status: 'skipped',
          message: `Container ${containerName} not found (not deployed yet)`
        });
      }

      console.error(`Failed to restart ${containerName}:`, detail);
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
