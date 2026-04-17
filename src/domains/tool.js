'use strict';

const registerCmd = require('../commands/register');
const unregisterCmd = require('../commands/unregister');
const config = require('../config');
const registry = require('../registry');

async function tool({ action, args, flags, cwd, isTTY }) {
  const { json, confirm, mode } = flags;
  
  switch (action) {
    case 'register': {
      const name = args[0];
      if (!name) {
        console.error('Error: tool name required');
        console.error('Usage: easyskillz tool register <name>');
        process.exit(1);
      }
      await registerCmd({ cwd, args: [name], json, isTTY });
      break;
    }
    
    case 'unregister': {
      const name = args[0];
      if (!name) {
        console.error('Error: tool name required');
        console.error('Usage: easyskillz tool unregister <name> [--mode=<full|revert>] [--confirm]');
        process.exit(1);
      }
      await unregisterCmd(name, cwd, { json, mode, confirm });
      break;
    }
    
    case 'list': {
      const cfg = config.read(cwd);
      const tools = cfg.tools || [];
      
      if (json) {
        console.log(JSON.stringify({
          ok: true,
          tools: tools.map(id => ({
            id,
            name: registry[id]?.name || id,
          })),
        }, null, 2));
      } else {
        if (tools.length === 0) {
          console.log('No tools registered.');
          console.log('');
          console.log('Run `easyskillz project sync` to detect and register tools.');
        } else {
          console.log('Registered tools:');
          tools.forEach(id => {
            const entry = registry[id];
            console.log(`  - ${entry ? entry.name : id} (${id})`);
          });
        }
      }
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
