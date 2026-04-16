'use strict';

const fs = require('fs');
const path = require('path');
const registry = require('../registry');
const config = require('../config');
const wirer = require('../wirer');
const { META_SKILL } = require('./plan');
const { writeInstruction } = require('../docs/syncFolder');

const META_CONTENT = [
  '# easyskillz',
  '',
  'Skills in this project are managed by easyskillz.',
  '',
  '## Commands',
  '',
  '### Skills',
  '`easyskillz add <name>`        — create a new skill and wire it to all registered tools',
  '`easyskillz sync`              — detect tools, wire skills, manage instruction files',
  '`easyskillz register <tool>`   — add a tool and wire all existing skills to it',
  '',
  '### Instruction files',
  '`easyskillz docs sync`         — force re-scan and centralize instruction files',
  '`easyskillz docs list`         — show centralized instruction files',
  '',
  '### Transfer',
  '`easyskillz export --target <path>` — copy skills + config to another project and sync it',
  '',
  '## Autonomous Operation',
  '',
  'When running commands autonomously (without user interaction):',
  '',
  '**Use command piping for non-interactive execution:**',
  '```bash',
  'echo "Y\\n1" | easyskillz sync  # Auto-accept docs management with unified strategy',
  'echo "Y\\n2" | easyskillz sync  # Auto-accept docs management with tool-specific strategy',
  'echo "n" | easyskillz sync      # Decline docs management',
  '```',
  '',
  '**For JSON output (machine-readable):**',
  '```bash',
  'easyskillz sync --json',
  'easyskillz docs list --json',
  '```',
  '',
  'After cloning this repo on a new machine, run:',
  '`easyskillz sync`',
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
    const result = wirer.wireSkill(skillName, a.entry, cwd, strategy);
    if (result !== 'already') out(`  ✓ Wired ${skillName} → ${a.entry.name}`);
  }

  for (const a of actions.filter((a) => a.type === 'instruct')) {
    writeInstruction(cwd, a.entry);
    out(`  ✓ Updated ${a.entry.instructionFile}`);
  }

}

module.exports = execute;
