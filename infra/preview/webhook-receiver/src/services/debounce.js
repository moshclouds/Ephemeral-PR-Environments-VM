const { debounceMs } = require('../config');

const recentRestarts = new Map();

/**
 * @returns {number|null} ms since last restart if still within window, otherwise null
 */
function checkDebounce(containerName) {
  const now = Date.now();
  const last = recentRestarts.get(containerName) || 0;
  const elapsed = now - last;
  if (elapsed < debounceMs) {
    return elapsed;
  }
  recentRestarts.set(containerName, now);
  return null;
}

module.exports = { checkDebounce };
