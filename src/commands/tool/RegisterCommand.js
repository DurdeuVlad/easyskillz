'use strict';

const BaseCommand = require('../../core/BaseCommand');
const registry = require('../../registry');
const config = require('../../config');
const wirer = require('../../wirer');
const { writeInstruction } = require('../../docs/syncFolder');
const { updateGitignore } = require('../../gitignore/updateGitignore');

class RegisterCommand extends BaseCommand {
  constructor(toolId, cwd, options) {
    super(options);
    this.toolId = toolId;
  }

  async execute() {
    const toolId = this.toolId.toLowerCase();
    const entry = registry[toolId];
    if (!entry) {
      this.out(`Error: unknown tool "${this.toolId}".`);
      this.out(`Known tools: ${Object.keys(registry).join(', ')}`);
      this.out('To add support for a new tool, see CONTRIBUTING.md.');
      process.exit(1);
    }

    const cfg = config.read(this.cwd);

    if (cfg.tools.includes(toolId)) {
      if (this.json) {
        this.jsonOutput({ ok: true, tool: toolId, added: false });
      } else {
        this.out(`${entry.name} already registered.`);
      }
      return;
    }

    // Add to config
    cfg.tools.push(toolId);
    config.write(this.cwd, cfg);
    this.out(`  ✓ Registered ${entry.name}`);

    // Wire all existing skills
    const results = wirer.wireAllSkills(entry, this.cwd, cfg.linkStrategy);
    for (const { skill, results: skillResults } of results) {
      const anyWired = skillResults.some(r => r.result !== 'already');
      if (anyWired) this.out(`  ✓ Wired skill "${skill}" → ${entry.name}`);
    }

    // Write managed block to tool's instruction file
    writeInstruction(this.cwd, entry);
    this.out(`  ✓ Updated ${entry.instructionFile}`);

    // Update .gitignore based on existing strategy (if set)
    if (cfg.gitignoreStrategy && cfg.gitignoreStrategy !== 'none') {
      const toolEntries = cfg.tools.map(id => registry[id]).filter(Boolean);
      const result = updateGitignore(this.cwd, toolEntries, cfg.gitignoreStrategy);
      if (result === 'updated') {
        this.out(`  ✓ Updated .gitignore (${cfg.gitignoreStrategy} strategy)`);
      }
    }

    this.out('');
    this.out(`${entry.name} registered. ${results.length} skill(s) wired.`);

    if (this.json) {
      this.jsonOutput({ 
        ok: true, 
        tool: toolId, 
        added: true, 
        skillsWired: results.length 
      });
    }
  }
}

module.exports = RegisterCommand;
