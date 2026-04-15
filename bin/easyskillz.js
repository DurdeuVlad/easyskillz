#!/usr/bin/env node
'use strict';

const { sync, add, register } = require('../index');

const [,, cmd, ...rest] = process.argv;
const json = rest.includes('--json');
const help = rest.includes('--help') || rest.includes('-h');
const args = rest.filter((a) => a !== '--json' && a !== '--help' && a !== '-h');
const cwd = process.cwd();
const isTTY = Boolean(process.stdin.isTTY);

const USAGE = `
easyskillz — single source of truth for AI agent skills

Usage:
  easyskillz sync                  detect tools, wire all skills, re-wire after cloning
  easyskillz add <name>            create a new skill and wire it to all registered tools
  easyskillz register <tool>       add a tool and wire all existing skills to it

Options:
  --json                           machine-readable JSON output

Supported tools: claude, codex, cursor, windsurf, copilot, gemini

Run \`easyskillz sync\` after cloning a repo to re-wire skills on a new machine.
`.trim();

async function main() {
  try {
    if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h' || (help && !['sync','add','register'].includes(cmd))) {
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
      case 'register':
        await register({ cwd, args, json, isTTY });
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
