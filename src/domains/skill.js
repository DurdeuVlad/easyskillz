'use strict';

const AddCommand = require('../commands/skill/AddCommand');
const ListCommand = require('../commands/skill/ListCommand');
const DeactivateCommand = require('../commands/skill/DeactivateCommand');
const ActivateCommand = require('../commands/skill/ActivateCommand');
const RemoveCommand = require('../commands/skill/RemoveCommand');

async function skill({ action, args, flags, cwd, isTTY }) {
  const { json } = flags;
  const options = { cwd, flags, isTTY, json };
  
  switch (action) {
    case 'add': {
      const name = args[0];
      if (!name) {
        console.error('Error: skill name required');
        console.error('Usage: easyskillz skill add <name>');
        process.exit(1);
      }
      const cmd = new AddCommand(name, cwd, options);
      await cmd.execute();
      break;
    }
    
    case 'list': {
      const cmd = new ListCommand(cwd, options);
      await cmd.execute();
      break;
    }
    
    case 'deactivate': {
      const name = args[0];
      if (!name) {
        console.error('Error: skill name required');
        console.error('Usage: easyskillz skill deactivate <name>');
        process.exit(1);
      }
      const cmd = new DeactivateCommand(name, cwd, options);
      await cmd.execute();
      break;
    }
    
    case 'activate': {
      const name = args[0];
      if (!name) {
        console.error('Error: skill name required');
        console.error('Usage: easyskillz skill activate <name>');
        process.exit(1);
      }
      const cmd = new ActivateCommand(name, cwd, options);
      await cmd.execute();
      break;
    }
    
    case 'remove': {
      const name = args[0];
      if (!name) {
        console.error('Error: skill name required');
        console.error('Usage: easyskillz skill remove <name> [--confirm]');
        process.exit(1);
      }
      const cmd = new RemoveCommand(name, cwd, options);
      await cmd.execute();
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
