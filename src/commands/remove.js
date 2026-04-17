'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const config = require('../config');
const registry = require('../registry');
const { isAIAgent, showAIWarning } = require('../utils/detectAI');

function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function remove(skillName, cwd, opts = {}) {
  const out = opts.out || console.log;
  const json = opts.json || false;
  const confirm = opts.confirm || false;
  
  const skillsDir = path.join(cwd, '.easyskillz', 'skills');
  const skillPath = path.join(skillsDir, skillName);
  const deactivatedPath = path.join(skillsDir, `.${skillName}.disabled`);
  
  let targetPath = null;
  let isDeactivated = false;
  
  // Check if skill exists (active or deactivated)
  if (fs.existsSync(skillPath)) {
    targetPath = skillPath;
  } else if (fs.existsSync(deactivatedPath)) {
    targetPath = deactivatedPath;
    isDeactivated = true;
  } else {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: `Skill "${skillName}" not found` }));
    } else {
      out(`Error: Skill "${skillName}" not found.`);
    }
    process.exit(1);
  }
  
  // If not confirmed and AI detected, show warning
  if (!confirm && isAIAgent()) {
    showAIWarning('skill remove');
    process.exit(1);
  }
  
  // If not confirmed, ask for confirmation
  if (!confirm) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    out('');
    out('This will permanently delete:');
    out(`  - ${targetPath}`);
    
    // Show symlinks that will be removed
    const cfg = config.read(cwd);
    const toolIds = cfg.tools || [];
    for (const toolId of toolIds) {
      const entry = registry[toolId];
      if (!entry) continue;
      const toolSkillPath = path.join(cwd, entry.skillsDir, skillName);
      if (fs.existsSync(toolSkillPath)) {
        out(`  - ${toolSkillPath} (symlink)`);
      }
    }
    
    out('');
    const answer = await ask(rl, 'Are you sure? [y/N]: ');
    rl.close();
    
    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      out('Cancelled.');
      process.exit(0);
    }
  }
  
  // Delete the skill directory
  fs.rmSync(targetPath, { recursive: true, force: true });
  
  // Remove symlinks from all registered tools
  const cfg = config.read(cwd);
  const toolIds = cfg.tools || [];
  let removedCount = 0;
  
  for (const toolId of toolIds) {
    const entry = registry[toolId];
    if (!entry) continue;
    
    const toolSkillPath = path.join(cwd, entry.skillsDir, skillName);
    
    if (fs.existsSync(toolSkillPath)) {
      try {
        fs.rmSync(toolSkillPath, { recursive: true, force: true });
        removedCount++;
      } catch (e) {
        // Ignore errors
      }
    }
  }
  
  if (json) {
    console.log(JSON.stringify({
      ok: true,
      skill: skillName,
      removed: true,
      wasDeactivated: isDeactivated,
      symlinksRemoved: removedCount,
    }));
  } else {
    out('');
    out(`✓ Removed skill "${skillName}"`);
    if (removedCount > 0) {
      out(`✓ Removed symlinks from ${removedCount} tool(s)`);
    }
  }
}

module.exports = remove;
