/**
 * Capture raw request body for HMAC verification (Infisical signs the exact payload bytes).
 */
function captureRawBody(req, _res, buf) {
  req.rawBody = buf.toString('utf8');
}

module.exports = { captureRawBody };
