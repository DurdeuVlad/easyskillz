'use strict';

const fs = require('fs');
const path = require('path');
const BaseCommand = require('../../core/BaseCommand');
const config = require('../../config');
const wirer = require('../../wirer');
const registry = require('../../registry');

class AddCommand extends BaseCommand {
  constructor(skillName, cwd, options) {
    super(options);
    this.skillName = skillName;
  }

  async execute() {
    const skillsDir = path.join(this.cwd, '.easyskillz', 'skills');
    const skillPath = path.join(skillsDir, this.skillName);
    const skillFile = path.join(skillPath, 'SKILL.md');

    // Check if skill already exists
    if (fs.existsSync(skillPath)) {
      this.error(`Skill "${this.skillName}" already exists`);
    }

    // Create skill directory and file
    fs.mkdirSync(skillPath, { recursive: true });
    fs.writeFileSync(skillFile, `# ${this.skillName}\n\nDescribe what this skill does.\n`, 'utf8');

    // Wire to all registered tools
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

    // Output
    if (this.json) {
      this.jsonOutput({
        ok: true,
        skill: this.skillName,
        file: skillFile,
        wiredTo: wired,
      });
    } else {
      this.out(`✓ Created skill "${this.skillName}"`);
      this.out(`  ${skillFile}`);
      this.out('');
      if (wired.length > 0) {
        this.out('Wired to:');
        wired.forEach(tool => this.out(`  ✓ ${tool}`));
      } else {
        this.out('No tools registered. Run `easyskillz project sync` to wire skills.');
      }
    }
  }
}

module.exports = AddCommand;
