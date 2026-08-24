const express = require('express');
const { checkDebounce } = require('../services/debounce');
const { restartContainer } = require('../services/docker');

const SAFE_NAME = /^[a-zA-Z0-9-]+$/;

const router = express.Router();

router.post('/infisical', async (req, res) => {
  const appName = req.query.app;
  const environment = req.body?.project?.environment || req.body?.environment;

  if (!appName || !environment) {
    return res.status(400).send('Missing app name or environment payload');
  }

  if (!SAFE_NAME.test(environment) || !SAFE_NAME.test(appName)) {
    console.error(`Invalid characters in payload: ${appName}-${environment}`);
    return res.status(400).send('Invalid characters');
  }

  const containerName = `${appName}-${environment}`;
  const elapsed = checkDebounce(containerName);
  if (elapsed !== null) {
    console.log(`Debounced restart for ${containerName} (${elapsed}ms since last)`);
    return res.status(200).json({
      status: 'debounced',
      message: `Skipped duplicate restart for ${containerName}`,
    });
  }

  console.log(`Received update for ${containerName}. Initiating restart...`);

  const result = await restartContainer(containerName);

  if (result.status === 'skipped') {
    console.warn(`Skipped restart — container not ready yet: ${containerName}`);
    return res.status(200).json(result);
  }

  if (result.status === 'error') {
    console.error(`Failed to restart ${containerName}:`, result.message);
    return res.status(500).json(result);
  }

  console.log(`Successfully restarted ${containerName}`);
  return res.status(200).json(result);
});

module.exports = router;
