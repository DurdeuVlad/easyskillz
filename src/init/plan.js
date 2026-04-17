'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const registry = require('../registry');
const wirer = require('../wirer');
const { MANAGED_OPEN } = require('../docs/syncFolder');
const { isAIAgent, showAIWarning } = require('../utils/detectAI');

const META_SKILL = 'easyskillz-reference';

function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

// Scan for unwired skills, build action list, print plan, confirm with user.
// Returns actions[] or null if user aborted.
async function plan(cwd, toolIds, strategy, out, isTTY) {
  const draftConfig = { tools: toolIds, linkStrategy: strategy };
  const unwired = wirer.scanUnwired(cwd, draftConfig, registry);

  if (unwired.length > 0) {
    out('Scanning for unwired skills...');
    const skillsDir = path.join(cwd, '.easyskillz', 'skills');
    if (fs.existsSync(skillsDir)) {
      const allSkills = fs.readdirSync(skillsDir).filter((n) =>
        fs.statSync(path.join(skillsDir, n)).isDirectory()
      );
      for (const skill of allSkills) {
        for (const toolId of toolIds) {
          const entry = registry[toolId];
          if (!entry) continue;
          const srcPath = path.resolve(cwd, '.easyskillz', 'skills', skill);
          const toolSkillsDir = path.resolve(cwd, entry.skillsDir);
          const wired = wirer.isWired(toolSkillsDir, skill, srcPath, strategy);
          out(`  ${skill.padEnd(20)} → ${entry.name}: ${wired ? '✓' : '✗ missing'}`);
        }
      }
      out('');
    }
  }

  const actions = [];

  for (const { skill, entry } of unwired) {
    actions.push({ type: 'wire', skill, entry });
  }

  // Meta-skill (always included to ensure it's up to date)
  actions.push({ type: 'meta-skill' });
  const unwiredMetaToolIds = new Set(
    unwired.filter((u) => u.skill === META_SKILL).map((u) => u.toolId)
  );
  for (const toolId of toolIds) {
    if (unwiredMetaToolIds.has(toolId)) continue;
    const entry = registry[toolId];
    const srcPath = path.resolve(cwd, '.easyskillz', 'skills', META_SKILL);
    const toolSkillsDir = path.resolve(cwd, entry.skillsDir);
    if (!wirer.isWired(toolSkillsDir, META_SKILL, srcPath, strategy)) {
      actions.push({ type: 'wire-meta', entry });
    }
  }

  // Instruction file managed blocks
  for (const toolId of toolIds) {
    const entry = registry[toolId];
    const instrPath = path.resolve(cwd, entry.instructionFile);
    const exists = fs.existsSync(instrPath);
    const hasManaged = exists && fs.readFileSync(instrPath, 'utf8').includes(MANAGED_OPEN);
    if (!hasManaged) actions.push({ type: 'instruct', entry });
  }

  // .gitignore (will be handled separately in sync command based on strategy)
  const gitignorePath = path.join(cwd, '.gitignore');
  const gitignoreContent = fs.existsSync(gitignorePath)
    ? fs.readFileSync(gitignorePath, 'utf8') : '';
  if (!gitignoreContent.includes('# easyskillz')) {
    actions.push({ type: 'gitignore' });
  }

  if (actions.length === 0) return actions;

  out('Plan:');
  for (const a of actions) {
    if (a.type === 'wire')       out(`  [ wire ]      ${a.entry.skillsDir}/${a.skill}  →  .easyskillz/skills/${a.skill}`);
    if (a.type === 'meta-skill') out(`  [ create ]    .easyskillz/skills/${META_SKILL}/SKILL.md`);
    if (a.type === 'wire-meta')  out(`  [ wire ]      ${a.entry.skillsDir}/${META_SKILL}  →  .easyskillz/skills/${META_SKILL}`);
    if (a.type === 'instruct')   out(`  [ instruct ]  ${a.entry.instructionFile}`);
    if (a.type === 'gitignore')  out(`  [ .gitignore ] configure based on your choice`);
  }
  out('');

  if (isTTY) {
    // Check for AI before prompting
    if (isAIAgent()) {
      showAIWarning('project sync');
      process.exit(1);
    }
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await ask(rl, 'Proceed? [Y/n] ');
    rl.close();
    if (answer.trim().toLowerCase() === 'n') return null;
    out('');
  }

  return actions;
}

module.exports = { plan, META_SKILL };
