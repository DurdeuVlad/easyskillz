'use strict';

const fs = require('fs');
const path = require('path');
const BaseCommand = require('../../core/BaseCommand');
const config = require('../../config');
const registry = require('../../registry');
const wirer = require('../../wirer');

class ActivateCommand extends BaseCommand {
  constructor(skillName, cwd, options) {
    super(options);
    this.cwd = cwd;
    this.skillName = skillName;
  }

  async execute() {
    const skillsDir = path.join(this.cwd, '.easyskillz', 'skills');
    const skillPath = path.join(skillsDir, this.skillName);
    const deactivatedPath = path.join(skillsDir, `.${this.skillName}.disabled`);
    
    // Check if skill is deactivated
    if (!fs.existsSync(deactivatedPath)) {
      if (fs.existsSync(skillPath)) {
        this.error(`Skill "${this.skillName}" is already active`);
      } else {
        this.error(`Skill "${this.skillName}" not found`);
      }
    }
    
    // Rename back to active
    fs.renameSync(deactivatedPath, skillPath);
    
    // Re-wire to all registered tools
    const cfg = config.read(this.cwd);
    const toolIds = cfg.tools || [];
    const wired = [];
    
    for (const toolId of toolIds) {
      const entry = registry[toolId];
      if (!entry) continue;
      
      const result = wirer.wireSkill(this.skillName, entry, this.cwd, cfg.linkStrategy);
      if (result !== 'already') {
        wired.push(entry.name);
      }
    }
    
    if (this.json) {
      this.jsonOutput({
        ok: true,
        skill: this.skillName,
        activated: true,
        wiredTo: wired,
      });
    } else {
      this.out(`✓ Activated skill "${this.skillName}"`);
      if (wired.length > 0) {
        wired.forEach(tool => this.out(`✓ Wired → ${tool}`));
      }
    }
  }
}

module.exports = ActivateCommand;
