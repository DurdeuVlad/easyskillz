'use strict';

const syncCmd = require('../commands/sync');
const exportCmd = require('../commands/export');

async function project({ action, args, flags, cwd, isTTY }) {
  const { json } = flags;
  
  switch (action) {
    case 'sync': {
      // Pass all flags to sync command
      await syncCmd({ cwd, args: [], json, isTTY, flags });
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
