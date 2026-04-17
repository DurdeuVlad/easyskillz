'use strict';

const listCmd = require('./src/commands/list');
const deactivateCmd = require('./src/commands/deactivate');
const activateCmd = require('./src/commands/activate');
const removeCmd = require('./src/commands/remove');
const unregisterCmd = require('./src/commands/unregister');

module.exports = {
  sync:      require('./src/commands/sync'),
  add:       require('./src/commands/add'),
  register:  require('./src/commands/register'),
  docs:      require('./src/commands/docs'),
  exportCmd: require('./src/commands/export'),
  
  // New commands
  list: ({ cwd, json }) => {
    listCmd(cwd, { json });
  },
  
  deactivate: ({ cwd, args, json }) => {
    const skillName = args[0];
    if (!skillName) {
      console.error('Error: skill name required');
      console.error('Usage: easyskillz deactivate <skill-name>');
      process.exit(1);
    }
    deactivateCmd(skillName, cwd, { json });
  },
  
  activate: ({ cwd, args, json }) => {
    const skillName = args[0];
    if (!skillName) {
      console.error('Error: skill name required');
      console.error('Usage: easyskillz activate <skill-name>');
      process.exit(1);
    }
    activateCmd(skillName, cwd, { json });
  },
  
  remove: async ({ cwd, args, json, confirm }) => {
    const skillName = args[0];
    if (!skillName) {
      console.error('Error: skill name required');
      console.error('Usage: easyskillz remove <skill-name> [--confirm]');
      process.exit(1);
    }
    await removeCmd(skillName, cwd, { json, confirm });
  },
  
  unregister: async ({ cwd, args, json, mode, confirm }) => {
    const toolId = args[0];
    if (!toolId) {
      console.error('Error: tool name required');
      console.error('Usage: easyskillz unregister <tool> [--mode=<full|revert>] [--confirm]');
      process.exit(1);
    }
    await unregisterCmd(toolId, cwd, { json, mode, confirm });
  },
};
