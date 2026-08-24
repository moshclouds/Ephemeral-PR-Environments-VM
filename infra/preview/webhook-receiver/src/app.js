const express = require('express');
const { captureRawBody } = require('./middleware/rawBody');
const { verifyInfisicalSignature } = require('./middleware/verifySignature');
const infisicalRoutes = require('./routes/infisical');

const app = express();

app.use(express.json({ verify: captureRawBody }));

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/hooks', verifyInfisicalSignature, infisicalRoutes);

module.exports = app;
