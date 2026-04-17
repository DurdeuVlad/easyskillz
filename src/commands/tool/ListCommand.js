'use strict';

const BaseCommand = require('../../core/BaseCommand');
const config = require('../../config');
const registry = require('../../registry');

class ListCommand extends BaseCommand {
  constructor(cwd, options) {
    super(options);
  }

  async execute() {
    const cfg = config.read(this.cwd);
    const tools = cfg.tools || [];

    if (this.json) {
      this.jsonOutput({
        ok: true,
        tools: tools.map(id => ({
          id,
          name: registry[id]?.name || id,
        })),
      });
    } else {
      if (tools.length === 0) {
        this.out('No tools registered.');
        this.out('');
        this.out('Run `easyskillz project sync` to detect and register tools.');
      } else {
        this.out('Registered tools:');
        tools.forEach(id => {
          const entry = registry[id];
          this.out(`  - ${entry ? entry.name : id} (${id})`);
        });
      }
    }
  }
}

module.exports = ListCommand;
