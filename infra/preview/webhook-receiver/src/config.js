module.exports = {
  port: Number(process.env.PORT) || 3000,
  webhookSecret: process.env.WEBHOOK_SECRET || 'super-secret-token-123',
  debounceMs: Number(process.env.WEBHOOK_DEBOUNCE_MS) || 15_000,
};
