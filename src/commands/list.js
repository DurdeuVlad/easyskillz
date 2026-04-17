'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config');

function list(cwd, opts = {}) {
  const out = opts.out || console.log;
  const json = opts.json || false;
  
  const skillsDir = path.join(cwd, '.easyskillz', 'skills');
  
  if (!fs.existsSync(skillsDir)) {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: 'No skills directory found' }));
    } else {
      out('No skills directory found. Run `easyskillz sync` first.');
    }
    return;
  }
  
  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  
  const activeSkills = [];
  const deactivatedSkills = [];
  
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    
    const name = entry.name;
    
    // Check if deactivated (starts with dot and ends with .disabled)
    if (name.startsWith('.') && name.endsWith('.disabled')) {
      const originalName = name.slice(1, -9); // Remove leading '.' and trailing '.disabled'
      deactivatedSkills.push(originalName);
    } else if (!name.startsWith('.')) {
      // Active skill (not hidden)
      activeSkills.push(name);
    }
  }
  
  if (json) {
    console.log(JSON.stringify({
      ok: true,
      active: activeSkills.sort(),
      deactivated: deactivatedSkills.sort(),
    }, null, 2));
  } else {
    if (activeSkills.length === 0 && deactivatedSkills.length === 0) {
      out('No skills found.');
      return;
    }
    
    if (activeSkills.length > 0) {
      out('Active skills:');
      activeSkills.sort().forEach(s => out(`  - ${s}`));
    }
    
    if (deactivatedSkills.length > 0) {
      if (activeSkills.length > 0) out('');
      out('Deactivated skills:');
      deactivatedSkills.sort().forEach(s => out(`  - ${s} (deactivated)`));
    }
  }
}

module.exports = list;
