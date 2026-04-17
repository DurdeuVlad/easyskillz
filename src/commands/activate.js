'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config');
const registry = require('../registry');
const wirer = require('../wirer');

function activate(skillName, cwd, opts = {}) {
  const out = opts.out || console.log;
  const json = opts.json || false;
  
  const skillsDir = path.join(cwd, '.easyskillz', 'skills');
  const skillPath = path.join(skillsDir, skillName);
  const deactivatedPath = path.join(skillsDir, `.${skillName}.disabled`);
  
  // Check if skill is deactivated
  if (!fs.existsSync(deactivatedPath)) {
    if (fs.existsSync(skillPath)) {
      if (json) {
        console.log(JSON.stringify({ ok: false, error: `Skill "${skillName}" is already active` }));
      } else {
        out(`Skill "${skillName}" is already active.`);
      }
      process.exit(1);
    } else {
      if (json) {
        console.log(JSON.stringify({ ok: false, error: `Skill "${skillName}" not found` }));
      } else {
        out(`Error: Skill "${skillName}" not found.`);
      }
      process.exit(1);
    }
  }
  
  // Rename back to active
  fs.renameSync(deactivatedPath, skillPath);
  
  // Re-wire to all registered tools
  const cfg = config.read(cwd);
  const toolIds = cfg.tools || [];
  const wired = [];
  
  for (const toolId of toolIds) {
    const entry = registry[toolId];
    if (!entry) continue;
    
    const result = wirer.wireSkill(skillName, entry, cwd, cfg.linkStrategy);
    if (result !== 'already') {
      wired.push(entry.name);
    }
  }
  
  if (json) {
    console.log(JSON.stringify({
      ok: true,
      skill: skillName,
      activated: true,
      wiredTo: wired,
    }));
  } else {
    out(`✓ Activated skill "${skillName}"`);
    if (wired.length > 0) {
      wired.forEach(tool => out(`✓ Wired → ${tool}`));
    }
  }
}

module.exports = activate;
