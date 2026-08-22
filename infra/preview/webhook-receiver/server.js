const express = require('express');
const { exec } = require('child_process');

const app = express();
app.use(express.json());

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
    const environment = req.body.environment;

    if (!appName || !environment) {
        return res.status(400).send('Missing app name or environment payload');
    }

    // 4. Sanitize inputs
    const safeRegex = /^[a-zA-Z0-9-]+$/;
    if (!safeRegex.test(environment) || !safeRegex.test(appName)) {
        console.error(`Invalid characters in payload: ${appName}-${environment}`);
        return res.status(400).send('Invalid characters');
    }

    const containerName = `${appName}-${environment}`;

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

