'use strict';

const fs = require('fs');
const path = require('path');
const registry = require('../registry');
const config = require('../config');
const wirer = require('../wirer');
const { META_SKILL } = require('./plan');

const META_CONTENT = [
  '# easyskillz',
  '',
  'Skills in this project are managed by easyskillz.',
  '',
  'When creating a new skill, run:',
  '```',
  'easyskillz add <name>',
  '```',
  '',
  'After cloning this repo on a new machine, run:',
  '```',
  'easyskillz sync',
  '```',
].join('\n') + '\n';

function execute(cwd, toolIds, strategy, actions, out) {
  config.write(cwd, { tools: toolIds, linkStrategy: strategy });

  if (actions.some((a) => a.type === 'meta-skill')) {
    const metaDir = path.join(cwd, '.easyskillz', 'skills', META_SKILL);
    fs.mkdirSync(metaDir, { recursive: true });
    fs.writeFileSync(path.join(metaDir, 'SKILL.md'), META_CONTENT, 'utf8');
    out('  ✓ Created meta-skill');
  }

  for (const a of actions.filter((a) => a.type === 'wire' || a.type === 'wire-meta')) {
    const skillName = a.type === 'wire' ? a.skill : META_SKILL;
    const result = wirer.wireSkill(skillName, a.entry, cwd, strategy);
    if (result !== 'already') out(`  ✓ Wired ${skillName} → ${a.entry.name}`);
  }

  for (const a of actions.filter((a) => a.type === 'instruct')) {
    wirer.appendInstruction(cwd, a.entry);
    out(`  ✓ Updated ${a.entry.instructionFile}`);
  }

  if (actions.some((a) => a.type === 'gitignore')) {
    const toolEntries = toolIds.map((id) => registry[id]).filter(Boolean);
    wirer.updateGitignore(cwd, toolEntries);
    out('  ✓ Updated .gitignore');
  }
}

module.exports = execute;
