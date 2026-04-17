'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config');
const registry = require('../registry');

function deactivate(skillName, cwd, opts = {}) {
  const out = opts.out || console.log;
  const json = opts.json || false;
  
  const skillsDir = path.join(cwd, '.easyskillz', 'skills');
  const skillPath = path.join(skillsDir, skillName);
  const deactivatedPath = path.join(skillsDir, `.${skillName}.disabled`);
  
  // Check if skill exists
  if (!fs.existsSync(skillPath)) {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: `Skill "${skillName}" not found` }));
    } else {
      out(`Error: Skill "${skillName}" not found.`);
    }
    process.exit(1);
  }
  
  // Check if already deactivated
  if (fs.existsSync(deactivatedPath)) {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: `Skill "${skillName}" is already deactivated` }));
    } else {
      out(`Skill "${skillName}" is already deactivated.`);
    }
    process.exit(1);
  }
  
  // Rename to deactivated
  fs.renameSync(skillPath, deactivatedPath);
  
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
        // Remove symlink or directory
        const stats = fs.lstatSync(toolSkillPath);
        if (stats.isSymbolicLink() || stats.isDirectory()) {
          fs.rmSync(toolSkillPath, { recursive: true, force: true });
          removedCount++;
        }
      } catch (e) {
        // Ignore errors
      }
    }
  }
  
  if (json) {
    console.log(JSON.stringify({
      ok: true,
      skill: skillName,
      deactivated: true,
      symlinksRemoved: removedCount,
    }));
  } else {
    out(`✓ Deactivated skill "${skillName}"`);
    if (removedCount > 0) {
      out(`✓ Removed symlinks from ${removedCount} tool(s)`);
    }
    out('');
    out(`To restore: easyskillz activate ${skillName}`);
  }
}

module.exports = deactivate;
