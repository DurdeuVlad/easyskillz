#!/usr/bin/env node
'use strict';

const { skill, tool, project, docs } = require('../index');

const [,, domain, action, ...rest] = process.argv;
const cwd = process.cwd();
const isTTY = Boolean(process.stdin.isTTY);

// Parse flags
function parseFlags(args) {
  const flags = {
    json: args.includes('--json'),
    help: args.includes('--help') || args.includes('-h'),
    confirm: args.includes('--confirm'),
  };
  
  // Parse key=value flags and handle space-separated values for known flags
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const match = arg.match(/^--([^=]+)(?:=(.+))?$/);
      if (match) {
        const [, key, value] = match;
        if (value !== undefined) {
          flags[key] = value;
        } else {
          // Check if next arg is a value (not another flag)
          if (i + 1 < args.length && !args[i+1].startsWith('--')) {
            flags[key] = args[i+1];
            i++; // Skip next arg
          } else {
            flags[key] = true;
          }
        }
      }
    }
  }
  
  // Filter out flags to get positional args
  const positional = args.filter(a => !a.startsWith('--'));
  
  return { flags, args: positional };
}

const { flags, args } = parseFlags(rest);

const USAGE = `
easyskillz — single source of truth for AI agent skills

Usage:
  easyskillz <domain> <action> [args] [flags]

Domains:
  skill      Manage skills (add, remove, activate, deactivate, list)
  tool       Manage AI tools (register, unregister, list)
  project    Project operations (sync, export)
  docs       Manage instruction files (sync, list, add, remove)

Skill Commands:
  easyskillz skill add <name>           create a new skill
  easyskillz skill remove <name>        permanently delete a skill
  easyskillz skill deactivate <name>    deactivate a skill (soft delete)
  easyskillz skill activate <name>      activate a deactivated skill
  easyskillz skill list                 list all skills

Tool Commands:
  easyskillz tool register <name>       add a tool to the project
  easyskillz tool unregister <name>     remove a tool from the project
  easyskillz tool list                  list registered tools

Project Commands:
  easyskillz project sync               detect tools, wire skills, setup project
  easyskillz project export --target <path>  copy skills to another project

Docs Commands:
  easyskillz docs sync                  centralize instruction files
  easyskillz docs list                  list managed instruction files

Flags:
  --json                                machine-readable JSON output
  --confirm                             skip confirmation prompts
  --docs=<yes|no>                       manage docs (project sync)
  --docs-strategy=<unified|tool-specific>  docs strategy (project sync)
  --gitignore=<full|conflict-only|none>    gitignore strategy (project sync)
  --mode=<full|revert>                  unregister mode (tool unregister)
  --target=<path>                       target path (project export)

Supported tools: claude, codex, cursor, windsurf, windsurf-workflows, copilot, gemini

Examples:
  easyskillz project sync --docs=yes --docs-strategy=unified --gitignore=full
  easyskillz skill add review-pr
  easyskillz tool unregister cursor --mode=full --confirm
`.trim();

async function main() {
  try {
    // Show help if no domain or help flag
    if (!domain || domain === 'help' || domain === '--help' || domain === '-h' || flags.help) {
      process.stdout.write(USAGE + '\n');
      return;
    }
    
    // Route to domain handlers
    switch (domain) {
      case 'skill':
        await skill({ action, args, flags, cwd, isTTY });
        break;
      case 'tool':
        await tool({ action, args, flags, cwd, isTTY });
        break;
      case 'project':
        await project({ action, args, flags, cwd, isTTY });
        break;
      case 'docs':
        await docs({ action, args, flags, cwd, isTTY });
        break;
      default:
        process.stderr.write(`Error: unknown domain "${domain}"\n\n${USAGE}\n`);
        process.exit(1);
    }
  } catch (e) {
    process.stderr.write(`Error: ${e.message}\n`);
    if (process.env.DEBUG) process.stderr.write(e.stack + '\n');
    process.exit(1);
  }
}

main();
