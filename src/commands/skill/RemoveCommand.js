'use strict';

const fs = require('fs');
const path = require('path');
const BaseCommand = require('../../core/BaseCommand');
const config = require('../../config');
const registry = require('../../registry');

class RemoveCommand extends BaseCommand {
  constructor(skillName, cwd, options) {
    super(options);
    this.cwd = cwd;
    this.skillName = skillName;
  }

  async execute() {
    const skillsDir = path.join(this.cwd, '.easyskillz', 'skills');
    const skillPath = path.join(skillsDir, this.skillName);
    const deactivatedPath = path.join(skillsDir, `.${this.skillName}.disabled`);
    
    let targetPath = null;
    let isDeactivated = false;
    
    // Check if skill exists (active or deactivated)
    if (fs.existsSync(skillPath)) {
      targetPath = skillPath;
    } else if (fs.existsSync(deactivatedPath)) {
      targetPath = deactivatedPath;
      isDeactivated = true;
    } else {
      this.error(`Skill "${this.skillName}" not found`);
    }
    
    // Show what will be deleted
    if (!this.flags.confirm && this.isTTY) {
      this.out('');
      this.out('This will permanently delete:');
      this.out(`  - ${targetPath}`);
      
      // Show symlinks that will be removed
      const cfg = config.read(this.cwd);
      const toolIds = cfg.tools || [];
      for (const toolId of toolIds) {
        const entry = registry[toolId];
        if (!entry) continue;
        const toolSkillPath = path.join(this.cwd, entry.skillsDir, this.skillName);
        if (fs.existsSync(toolSkillPath)) {
          this.out(`  - ${toolSkillPath} (symlink)`);
        }
      }
      this.out('');
    }
    
    // Confirm deletion
    const confirmed = await this.confirm('Are you sure? [y/N]: ', 'skill remove', true);
    
    if (!confirmed) {
      this.out('Cancelled.');
      return;
    }
    
    // Delete the skill directory
    fs.rmSync(targetPath, { recursive: true, force: true });
    
    // Remove symlinks from all registered tools
    const cfg = config.read(this.cwd);
    const toolIds = cfg.tools || [];
    let removedCount = 0;
    
    for (const toolId of toolIds) {
      const entry = registry[toolId];
      if (!entry) continue;
      
      const toolSkillPath = path.join(this.cwd, entry.skillsDir, this.skillName);
      
      if (fs.existsSync(toolSkillPath)) {
        try {
          fs.rmSync(toolSkillPath, { recursive: true, force: true });
          removedCount++;
        } catch (e) {
          // Ignore errors
        }
      }
    }
    
    if (this.json) {
      this.jsonOutput({
        ok: true,
        skill: this.skillName,
        removed: true,
        wasDeactivated: isDeactivated,
        symlinksRemoved: removedCount,
      });
    } else {
      this.out('');
      this.out(`✓ Removed skill "${this.skillName}"`);
      if (removedCount > 0) {
        this.out(`✓ Removed symlinks from ${removedCount} tool(s)`);
      }
    }
  }
}

module.exports = RemoveCommand;
