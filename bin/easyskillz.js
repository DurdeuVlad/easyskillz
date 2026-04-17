#!/usr/bin/env node
'use strict';

const { sync, add, register, docs, exportCmd, list, deactivate, activate, remove, unregister } = require('../index');

const [,, cmd, ...rest] = process.argv;
const json = rest.includes('--json');
const help = rest.includes('--help') || rest.includes('-h');
const confirm = rest.includes('--confirm');
const modeArg = rest.find(a => a.startsWith('--mode='));
const mode = modeArg ? modeArg.split('=')[1] : null;
const args = rest.filter((a) => 
  a !== '--json' && 
  a !== '--help' && 
  a !== '-h' && 
  a !== '--confirm' && 
  !a.startsWith('--mode=')
);
const cwd = process.cwd();
const isTTY = Boolean(process.stdin.isTTY);

const USAGE = `
easyskillz — single source of truth for AI agent skills

Usage:
  easyskillz sync                       detect tools, wire all skills, re-wire after cloning
  easyskillz add <name>                 create a new skill and wire it to all registered tools
  easyskillz list                       list all skills (active and deactivated)
  easyskillz deactivate <name>          deactivate a skill (soft delete, reversible)
  easyskillz activate <name>            activate a deactivated skill
  easyskillz remove <name> [--confirm]  permanently delete a skill
  easyskillz register <tool>            add a tool and wire all existing skills to it
  easyskillz unregister <tool> [--mode=<full|revert>] [--confirm]
                                        remove a tool from the project
  easyskillz docs <sync|list|add|remove> manage instruction files
  easyskillz export --target <path>     copy skills + config to another project

Options:
  --json                                machine-readable JSON output
  --confirm                             skip confirmation prompts (for AI agents)
  --mode=<full|revert>                  unregister mode: full delete or revert

Supported tools: claude, codex, cursor, windsurf, windsurf-workflows, copilot, gemini

Run \`easyskillz sync\` after cloning a repo to re-wire skills on a new machine.
`.trim();

async function main() {
  try {
    const validCmds = ['sync','add','list','deactivate','activate','remove','register','unregister','docs','export'];
    if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h' || (help && !validCmds.includes(cmd))) {
      process.stdout.write(USAGE + '\n');
      return;
    }
    switch (cmd) {
      case 'sync':
        await sync({ cwd, args, json, isTTY });
        break;
      case 'add':
        await add({ cwd, args, json, isTTY });
        break;
      case 'list':
        await list({ cwd, json });
        break;
      case 'deactivate':
        await deactivate({ cwd, args, json });
        break;
      case 'activate':
        await activate({ cwd, args, json });
        break;
      case 'remove':
        await remove({ cwd, args, json, confirm });
        break;
      case 'register':
        await register({ cwd, args, json, isTTY });
        break;
      case 'unregister':
        await unregister({ cwd, args, json, mode, confirm });
        break;
      case 'docs': {
        const subAction = args[0] || '';
        await docs({ cwd, subAction, args: args.slice(1), json, isTTY });
        break;
      }
      case 'export':
        await exportCmd({ cwd, args, json, isTTY });
        break;
      default:
        process.stderr.write(`Error: unknown command "${cmd}"\n\n${USAGE}\n`);
        process.exit(1);
    }
  } catch (e) {
    process.stderr.write(`Error: ${e.message}\n`);
    if (process.env.DEBUG) process.stderr.write(e.stack + '\n');
    process.exit(1);
  }
}

main();
