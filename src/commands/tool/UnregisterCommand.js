'use strict';

const fs = require('fs');
const path = require('path');
const BaseCommand = require('../../core/BaseCommand');
const config = require('../../config');
const registry = require('../../registry');

class UnregisterCommand extends BaseCommand {
  constructor(toolId, cwd, options) {
    super(options);
    this.toolId = toolId;
  }

  async execute() {
    const entry = registry[this.toolId];
    if (!entry) {
      this.out(`Error: unknown tool "${this.toolId}".`);
      this.out(`Known tools: ${Object.keys(registry).join(', ')}`);
      process.exit(1);
    }

    const cfg = config.read(this.cwd);

    // Check if tool is registered
    if (!cfg.tools || !cfg.tools.includes(this.toolId)) {
      this.error(`Tool "${entry.name}" is not registered in this project`);
    }

    // Get mode (full or revert)
    const mode = await this.getFlagOrPrompt(
      'mode',
      'Mode? [1=full delete, 2=revert]: ',
      'tool unregister',
      'revert'
    );

    let selectedMode;
    if (mode === '1' || mode === 'full') {
      selectedMode = 'full';
    } else if (mode === '2' || mode === 'revert') {
      selectedMode = 'revert';
    } else {
      this.error('Invalid mode. Use "full" or "revert"');
    }

    // Show what will happen
    if (!this.flags.confirm && this.isTTY) {
      this.out('');
      this.out('This will:');
      this.out(`  - Remove "${this.toolId}" from .easyskillz/easyskillz.json`);
      
      if (selectedMode === 'full') {
        const toolDir = path.join(this.cwd, entry.skillsDir.split('/')[0]);
        this.out(`  - Delete ${toolDir}/ directory and all contents`);
      } else {
        this.out(`  - Keep ${entry.skillsDir.split('/')[0]}/ directory intact`);
      }
      this.out('');
    }

    // Confirm
    const confirmed = await this.confirm('Are you sure? [y/N]: ', 'tool unregister', true);
    
    if (!confirmed) {
      this.out('Cancelled.');
      return;
    }

    // Remove tool from config
    cfg.tools = cfg.tools.filter(t => t !== this.toolId);
    config.write(this.cwd, cfg);

    let deletedDir = false;

    // If full mode, delete tool directory
    if (selectedMode === 'full') {
      const toolDir = path.join(this.cwd, entry.skillsDir.split('/')[0]);
      if (fs.existsSync(toolDir)) {
        fs.rmSync(toolDir, { recursive: true, force: true });
        deletedDir = true;
      }
    }

    if (this.json) {
      this.jsonOutput({
        ok: true,
        tool: this.toolId,
        unregistered: true,
        mode: selectedMode,
        directoryDeleted: deletedDir,
      });
    } else {
      this.out('');
      this.out(`✓ Unregistered ${entry.name} (${selectedMode} mode)`);
      if (deletedDir) {
        this.out(`✓ Deleted ${entry.skillsDir.split('/')[0]}/ directory`);
      }
    }
  }
}

module.exports = UnregisterCommand;
