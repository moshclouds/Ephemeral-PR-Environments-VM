const crypto = require('crypto');
const { webhookSecret } = require('../config');

function verifyInfisicalSignature(req, res, next) {
  const header = req.headers['x-infisical-signature'];
  if (!header || typeof header !== 'string') {
    console.warn('Unauthorized webhook attempt');
    return res.status(401).send('Unauthorized');
  }

  const [, signature] = header.split(';');
  if (!signature) {
    console.warn('Unauthorized webhook attempt');
    return res.status(401).send('Unauthorized');
  }

  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(req.rawBody || '')
    .digest('hex');

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    console.warn('Unauthorized webhook attempt');
    return res.status(401).send('Unauthorized');
  }

  return next();
}

module.exports = { verifyInfisicalSignature };
