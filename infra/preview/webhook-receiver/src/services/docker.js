const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * Restart a Docker container by name.
 * @returns {{ status: 'success'|'skipped'|'error', message: string }}
 */
async function restartContainer(containerName) {
  try {
    await execAsync(`docker restart ${containerName}`);
    return {
      status: 'success',
      message: `Restarted ${containerName}`,
    };
  } catch (error) {
    const detail = String(error.stderr || error.message || '');
    if (/No such container/i.test(detail)) {
      return {
        status: 'skipped',
        message: `Container ${containerName} not found (not deployed yet)`,
      };
    }
    return {
      status: 'error',
      message: detail || 'Failed to restart container',
    };
  }
}

module.exports = { restartContainer };
