'use strict';

const RegisterCommand = require('../commands/tool/RegisterCommand');
const UnregisterCommand = require('../commands/tool/UnregisterCommand');
const ListCommand = require('../commands/tool/ListCommand');

async function tool({ action, args, flags, cwd, isTTY }) {
  const { json } = flags;
  const options = { cwd, flags, isTTY, json };
  
  switch (action) {
    case 'register': {
      const name = args[0];
      if (!name) {
        console.error('Error: tool name required');
        console.error('Usage: easyskillz tool register <name>');
        process.exit(1);
      }
      const cmd = new RegisterCommand(name, cwd, options);
      await cmd.execute();
      break;
    }
    
    case 'unregister': {
      const name = args[0];
      if (!name) {
        console.error('Error: tool name required');
        console.error('Usage: easyskillz tool unregister <name> [--mode=<full|revert>] [--confirm]');
        process.exit(1);
      }
      const cmd = new UnregisterCommand(name, cwd, options);
      await cmd.execute();
      break;
    }
    
    case 'list': {
      const cmd = new ListCommand(cwd, options);
      await cmd.execute();
      break;
    }
    
    default:
      console.error(`Error: unknown tool action "${action}"`);
      console.error('');
      console.error('Available actions: register, unregister, list');
      process.exit(1);
  }
}

module.exports = tool;
