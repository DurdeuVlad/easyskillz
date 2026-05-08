'use strict';

const fs = require('fs');
const path = require('path');
const BaseCommand = require('../../core/BaseCommand');
const config = require('../../config');
const registry = require('../../registry');
const wirer = require('../../wirer');

class DeactivateCommand extends BaseCommand {
  constructor(skillName, cwd, options) {
    super(options);
    this.cwd = cwd;
    this.skillName = skillName;
  }

  async execute() {
    const skillsDir = path.join(this.cwd, '.easyskillz', 'skills');
    const skillPath = path.join(skillsDir, this.skillName);
    const deactivatedPath = path.join(skillsDir, `.${this.skillName}.disabled`);
    
    // Check if skill exists
    if (!fs.existsSync(skillPath)) {
      this.error(`Skill "${this.skillName}" not found`);
    }
    
    // Check if already deactivated
    if (fs.existsSync(deactivatedPath)) {
      this.error(`Skill "${this.skillName}" is already deactivated`);
    }

    const cfg = config.read(this.cwd);
    const toolIds = cfg.tools || [];
    const targetsByTool = toolIds
      .map((toolId) => registry[toolId])
      .filter(Boolean)
      .flatMap((entry) => wirer.getSkillTargets(entry, this.skillName, skillPath));
    
    // Rename to deactivated
    fs.renameSync(skillPath, deactivatedPath);
    
    // Remove symlinks from all registered tools
    let removedCount = 0;
    
    for (const target of targetsByTool) {
      const toolSkillPath = path.join(this.cwd, target.targetPath);
      if (!fs.existsSync(toolSkillPath)) continue;
      try {
        const stats = fs.lstatSync(toolSkillPath);
        if (stats.isSymbolicLink() || stats.isDirectory() || stats.isFile()) {
          fs.rmSync(toolSkillPath, { recursive: true, force: true });
          removedCount++;
        }
      } catch (e) {
        // Ignore errors
      }
    }
    
    if (this.json) {
      this.jsonOutput({
        ok: true,
        skill: this.skillName,
        deactivated: true,
        symlinksRemoved: removedCount,
      });
    } else {
      this.out(`✓ Deactivated skill "${this.skillName}"`);
      if (removedCount > 0) {
        this.out(`✓ Removed symlinks from ${removedCount} tool(s)`);
      }
      this.out('');
      this.out(`To restore: easyskillz skill activate ${this.skillName}`);
    }
  }
}

module.exports = DeactivateCommand;
