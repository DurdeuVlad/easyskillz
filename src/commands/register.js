'use strict';

const registry = require('../registry');
const config = require('../config');
const wirer = require('../wirer');
const { writeInstruction } = require('../docs/syncFolder');
const { updateGitignore } = require('../gitignore/updateGitignore');

async function register({ cwd, args, json }) {
  const out = json ? () => {} : (s) => process.stdout.write(s + '\n');
  const err = (s) => process.stderr.write(s + '\n');

  const toolId = args[0];
  if (!toolId) {
    err('Error: tool name required. Usage: easyskillz register <tool>');
    err(`Known tools: ${Object.keys(registry).join(', ')}`);
    process.exit(1);
  }

  const entry = registry[toolId];
  if (!entry) {
    err(`Error: unknown tool "${toolId}".`);
    err(`Known tools: ${Object.keys(registry).join(', ')}`);
    err('To add support for a new tool, see CONTRIBUTING.md.');
    process.exit(1);
  }

  const cfg = config.read(cwd);

  if (cfg.tools.includes(toolId)) {
    out(`${entry.name} already registered.`);
    if (json) process.stdout.write(JSON.stringify({ ok: true, tool: toolId, added: false }) + '\n');
    return;
  }

  // Add to config
  cfg.tools.push(toolId);
  config.write(cwd, cfg);
  out(`  ✓ Registered ${entry.name}`);

  // Wire all existing skills
  const results = wirer.wireAllSkills(entry, cwd, cfg.linkStrategy);
  for (const { skill, result } of results) {
    if (result !== 'already') out(`  ✓ Wired skill "${skill}" → ${entry.name}`);
  }

  // Write managed block to tool's instruction file
  writeInstruction(cwd, entry);
  out(`  ✓ Updated ${entry.instructionFile}`);

  // Update .gitignore based on existing strategy (if set)
  if (cfg.gitignoreStrategy && cfg.gitignoreStrategy !== 'none') {
    const result = updateGitignore(cwd, [entry], cfg.gitignoreStrategy);
    if (result === 'updated') {
      out(`  ✓ Updated .gitignore (${cfg.gitignoreStrategy} strategy)`);
    }
  }

  out('');
  out(`${entry.name} registered. ${results.length} skill(s) wired.`);

  if (json) {
    process.stdout.write(JSON.stringify({ ok: true, tool: toolId, added: true, wired: results }) + '\n');
  }
}

module.exports = register;
