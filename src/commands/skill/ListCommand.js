'use strict';

const fs = require('fs');
const path = require('path');
const BaseCommand = require('../../core/BaseCommand');

class ListCommand extends BaseCommand {
  constructor(cwd, options) {
    super(options);
  }

  async execute() {
    const skillsDir = path.join(this.cwd, '.easyskillz', 'skills');
    
    if (!fs.existsSync(skillsDir)) {
      if (this.json) {
        this.jsonOutput({ ok: false, error: 'No skills directory found' });
      } else {
        this.out('No skills directory found. Run `easyskillz project sync` first.');
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
    
    if (this.json) {
      this.jsonOutput({
        ok: true,
        active: activeSkills.sort(),
        deactivated: deactivatedSkills.sort(),
      });
    } else {
      if (activeSkills.length === 0 && deactivatedSkills.length === 0) {
        this.out('No skills found.');
        return;
      }
      
      if (activeSkills.length > 0) {
        this.out('Active skills:');
        activeSkills.sort().forEach(s => this.out(`  - ${s}`));
      }
      
      if (deactivatedSkills.length > 0) {
        if (activeSkills.length > 0) this.out('');
        this.out('Deactivated skills:');
        deactivatedSkills.sort().forEach(s => this.out(`  - ${s} (deactivated)`));
      }
    }
  }
}

module.exports = ListCommand;
