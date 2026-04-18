'use strict';

const fs = require('fs');
const path = require('path');
const registry = require('../registry');
const config = require('../config');
const wirer = require('../wirer');
const { META_SKILL } = require('./plan');
const { writeInstruction } = require('../docs/syncFolder');

const META_CONTENT = [
  '---',
  `name: ${META_SKILL}`,
  'description: Documentation and best practices for using easyskillz to manage AI agent skills.',
  '---',
  '# easyskillz — Skill Management System',
  '',
  'This project uses **easyskillz** to manage AI agent skills across multiple tools.',
  '',
  '## Why Use easyskillz',
  '',
  '- **Single source of truth**: Skills live in `.easyskillz/skills/` and are automatically wired to all AI tools',
  '- **Zero duplication**: Create once, use everywhere (Claude, Cursor, Codex, Windsurf, etc.)',
  '- **Team-friendly**: Teammates run `easyskillz sync` after cloning — everything just works',
  '- **Centralized docs**: Instruction files managed in `.easyskillz/docs/`, symlinked to tool locations',
  '',
  '## Creating Skills — ALWAYS Use easyskillz',
  '',
  '**IMPORTANT**: Never manually create skill files. Always use:',
  '',
  '```bash',
  'easyskillz add <skill-name>',
  '```',
  '',
  '**Why?**',
  '- Automatically wires to ALL registered tools (Claude, Cursor, Codex, etc.)',
  '- Creates proper directory structure in `.easyskillz/skills/`',
  '- Ensures symlinks/stubs are created correctly',
  '- Maintains single source of truth',
  '',
  '**Example workflow:**',
  '```bash',
  '# Create a new skill',
  'easyskillz add review-pr',
  '',
  '# Edit the skill',
  'code .easyskillz/skills/review-pr/SKILL.md',
  '',
  '# It\'s automatically available in all tools!',
  '```',
  '',
  '## Core Commands',
  '',
  '### Skill Management',
  '- `easyskillz add <name>` — Create a new skill and wire it to all registered tools',
  '- `easyskillz sync` — Detect tools, wire all skills, manage instruction files',
  '- `easyskillz register <tool>` — Add a new tool and wire all existing skills to it',
  '',
  '### Instruction File Management',
  '- `easyskillz docs sync` — Force re-scan and centralize instruction files',
  '- `easyskillz docs list` — Show centralized instruction files and their status',
  '',
  '### Project Transfer',
  '- `easyskillz export --target <path>` — Copy skills + config to another project',
  '',
  '## Autonomous Operation',
  '',
  'When running commands autonomously (without user interaction):',
  '',
  '**Non-interactive mode (bash/sh):**',
  '```bash',
  'printf "Y\\n1\\n1\\n" | easyskillz sync  # Accept docs (unified) + gitignore (full)',
  'printf "n\\n2\\n" | easyskillz sync      # Decline docs + gitignore (conflict-only)',
  '```',
  '',
  '**Machine-readable output:**',
  '```bash',
  'easyskillz sync --json',
  'easyskillz add my-skill --json',
  'easyskillz docs list --json',
  '```',
  '',
  '## After Cloning',
  '',
  'When you or a teammate clones this repo:',
  '',
  '```bash',
  'easyskillz sync',
  '```',
  '',
  'This regenerates all symlinks and wires skills to your local AI tools.',
  '',
  '## File Structure',
  '',
  '```',
  '.easyskillz/',
  '  skills/           ← Source of truth (committed)',
  '    review-pr/',
  '      SKILL.md',
  '    commit-msg/',
  '      SKILL.md',
  '  docs/             ← Centralized instruction files (committed)',
  '    INSTRUCTION.md  ← Unified instruction file',
  '  easyskillz.json   ← Config (committed)',
  '',
  '.claude/skills/     ← Symlinks (gitignored, regenerated on sync)',
  '.cursor/skills/     ← Symlinks (gitignored, regenerated on sync)',
  '```',
  '',
  '## Best Practices',
  '',
  '1. **Always use `easyskillz add`** — Never create skills manually',
  '2. **Edit in `.easyskillz/skills/`** — This is the source of truth',
  '3. **Commit `.easyskillz/`** — Skills and config go in git',
  '4. **Gitignore tool directories** — `.claude/`, `.cursor/`, etc. are machine-local',
  '5. **Run `sync` after cloning** — Regenerates symlinks for your machine',
].join('\n') + '\n';

function execute(cwd, toolIds, strategy, actions, out) {
  const existingCfg = config.read(cwd);
  config.write(cwd, { 
    tools: toolIds, 
    linkStrategy: strategy,
    manageDocs: existingCfg.manageDocs,
    docsStrategy: existingCfg.docsStrategy
  });

  const metaDir = path.join(cwd, '.easyskillz', 'skills', META_SKILL);
  fs.mkdirSync(metaDir, { recursive: true });
  fs.writeFileSync(path.join(metaDir, 'SKILL.md'), META_CONTENT, 'utf8');
  if (actions.some((a) => a.type === 'meta-skill')) {
    out('  ✓ Created meta-skill');
  }

  for (const a of actions.filter((a) => a.type === 'wire' || a.type === 'wire-meta')) {
    const skillName = a.type === 'wire' ? a.skill : META_SKILL;
    const results = wirer.wireSkillToAllLocations(skillName, a.entry, cwd, strategy);
    const anyWired = results.some(r => r.result !== 'already');
    if (anyWired) out(`  ✓ Wired ${skillName} → ${a.entry.name}`);
  }

  for (const a of actions.filter((a) => a.type === 'instruct')) {
    writeInstruction(cwd, a.entry);
    out(`  ✓ Updated ${a.entry.instructionFile}`);
  }

}

module.exports = execute;
