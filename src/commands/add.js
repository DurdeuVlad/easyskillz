'use strict';

const fs = require('fs');
const path = require('path');
const registry = require('../registry');
const config = require('../config');
const wirer = require('../wirer');

const SKILL_TEMPLATE = (name) => [
  `# ${name}`,
  '',
  '<!-- Describe what this skill does -->',
  '',
  '## Instructions',
  '',
  '<!-- Step-by-step instructions for the AI agent -->',
  '',
].join('\n');

const NAME_RE = /^[a-z0-9][a-z0-9-_]*$/i;

async function add({ cwd, args, json }) {
  const out = json ? () => {} : (s) => process.stdout.write(s + '\n');
  const err = (s) => process.stderr.write(s + '\n');

  const name = args[0];
  if (!name) {
    err('Error: skill name required. Usage: easyskillz add <name>');
    process.exit(1);
  }
  if (name.includes('..') || name.includes('/') || name.includes('\\') || !NAME_RE.test(name)) {
    err(`Error: invalid skill name "${name}". Use letters, numbers, hyphens, underscores only.`);
    process.exit(1);
  }

  const cfg = config.read(cwd);
  if (cfg.tools.length === 0) {
    err('No tools registered. Run `easyskillz sync` first to detect your tools.');
    process.exit(1);
  }

  const skillDir = path.join(cwd, '.easyskillz', 'skills', name);
  const skillFile = path.join(skillDir, 'SKILL.md');

  if (fs.existsSync(skillFile)) {
    out(`Skill "${name}" already exists.`);
    if (json) process.stdout.write(JSON.stringify({ ok: true, name, created: false }) + '\n');
    return;
  }

  // Create skill source
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(skillFile, SKILL_TEMPLATE(name), 'utf8');
  out(`  ✓ Created .easyskillz/skills/${name}/SKILL.md`);

  // Wire to all registered tools
  const results = [];
  for (const toolId of cfg.tools) {
    const entry = registry[toolId];
    if (!entry) continue;
    const result = wirer.wireSkill(name, entry, cwd, cfg.linkStrategy);
    results.push({ tool: entry.name, result });
    if (result !== 'already') out(`  ✓ Wired → ${entry.name}`);
  }

  out('');
  out(`Skill "${name}" added to: ${results.map((r) => r.tool).join(', ')}`);

  if (json) {
    process.stdout.write(JSON.stringify({ ok: true, name, created: true, wired: results }) + '\n');
  }
}

module.exports = add;
