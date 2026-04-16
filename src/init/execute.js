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
  '`easyskillz sync`              — detect tools, wire skills, update instruction files',
  '`easyskillz register <tool>`   — add a tool and wire all existing skills to it',
  '',
  '### Instruction files',
  '`easyskillz docs sync`              — update instruction files for all tracked folders',
  '`easyskillz docs list`              — show instruction files and their status',
  '`easyskillz docs add <folder>`      — start tracking a subfolder',
  '`easyskillz docs remove <folder>`   — stop tracking a subfolder',
  '',
  '### Transfer',
  '`easyskillz export --target <path>` — copy skills + config to another project and sync it',
  '',
  'After cloning this repo on a new machine, run:',
  '`easyskillz sync`',
].join('\n') + '\n';

function execute(cwd, toolIds, strategy, actions, out) {
  const existingCfg = config.read(cwd);
  const docsFolders = existingCfg.docsFolders.length > 0 ? existingCfg.docsFolders : ['.'];
  config.write(cwd, { tools: toolIds, linkStrategy: strategy, docsFolders });

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

  if (actions.some((a) => a.type === 'gitignore')) {
    const toolEntries = toolIds.map((id) => registry[id]).filter(Boolean);
    wirer.updateGitignore(cwd, toolEntries);
    out('  ✓ Updated .gitignore');
  }

}

module.exports = execute;
