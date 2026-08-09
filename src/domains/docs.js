'use strict';

const stateStore = require('../state');
const ownership = require('../docs/ownership');

async function docs({ action, args, flags, cwd }) {
  if (action === 'adopt') return ownership.adopt({ cwd, source: args[0], target: flags.target, write: Boolean(flags.write && !flags['dry-run']) });
  if (action === 'sync') return ownership.sync({ cwd, write: Boolean(flags.write && !flags['dry-run']) });
  if (action === 'restore') return ownership.restore({ cwd, backupId: args[0], write: Boolean(flags.write && !flags['dry-run']) });
  if (action === 'list') { const result = stateStore.read(cwd); if (!result.ok) throw Object.assign(new Error(result.error.message), { code: result.error.code }); return { mappings: result.state.docs }; }
  throw Object.assign(new Error(`unknown docs action: ${action}`), { code: 'E_USAGE_UNKNOWN_COMMAND', exitCode: 2 });
}

module.exports = docs;
