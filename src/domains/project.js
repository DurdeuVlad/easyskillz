'use strict';

const SyncCommand = require('../commands/project/SyncCommand');
const exportCmd = require('../commands/export');

async function project({ action, args, flags, cwd, isTTY }) {
  const { json } = flags;
  const options = { cwd, flags, isTTY, json };
  
  switch (action) {
    case 'sync': {
      const cmd = new SyncCommand(options);
      await cmd.execute();
      break;
    }
    
    case 'export': {
      const target = flags.target || args.find(a => a.startsWith('--target='))?.split('=')[1];
      if (!target) {
        console.error('Error: target path required');
        console.error('Usage: easyskillz project export --target <path>');
        process.exit(1);
      }
      await exportCmd({ cwd, args: ['--target', target], json, isTTY });
      break;
    }
    
    default:
      console.error(`Error: unknown project action "${action}"`);
      console.error('');
      console.error('Available actions: sync, export');
      process.exit(1);
  }
}

module.exports = project;
