'use strict';

const addCmd = require('../commands/add');
const listCmd = require('../commands/list');
const deactivateCmd = require('../commands/deactivate');
const activateCmd = require('../commands/activate');
const removeCmd = require('../commands/remove');

async function skill({ action, args, flags, cwd, isTTY }) {
  const { json, confirm } = flags;
  
  switch (action) {
    case 'add': {
      const name = args[0];
      if (!name) {
        console.error('Error: skill name required');
        console.error('Usage: easyskillz skill add <name>');
        process.exit(1);
      }
      await addCmd({ cwd, args: [name], json, isTTY });
      break;
    }
    
    case 'list':
      listCmd(cwd, { json });
      break;
    
    case 'deactivate': {
      const name = args[0];
      if (!name) {
        console.error('Error: skill name required');
        console.error('Usage: easyskillz skill deactivate <name>');
        process.exit(1);
      }
      deactivateCmd(name, cwd, { json });
      break;
    }
    
    case 'activate': {
      const name = args[0];
      if (!name) {
        console.error('Error: skill name required');
        console.error('Usage: easyskillz skill activate <name>');
        process.exit(1);
      }
      activateCmd(name, cwd, { json });
      break;
    }
    
    case 'remove': {
      const name = args[0];
      if (!name) {
        console.error('Error: skill name required');
        console.error('Usage: easyskillz skill remove <name> [--confirm]');
        process.exit(1);
      }
      await removeCmd(name, cwd, { json, confirm });
      break;
    }
    
    default:
      console.error(`Error: unknown skill action "${action}"`);
      console.error('');
      console.error('Available actions: add, list, deactivate, activate, remove');
      process.exit(1);
  }
}

module.exports = skill;
