'use strict';

const BaseCommand = require('../../core/BaseCommand');
const detect = require('../../init/detect');
const { plan } = require('../../init/plan');
const execute = require('../../init/execute');
const config = require('../../config');
const registry = require('../../registry');
const { scanAll } = require('../../docs/scanInstructionFiles');
const { centralize } = require('../../docs/centralizeFiles');
const { updateGitignore } = require('../../gitignore/updateGitignore');

class SyncCommand extends BaseCommand {
  constructor(options) {
    super(options);
  }

  async execute() {
    // Detect tools
    const { toolIds, strategy, existingConfig } = detect(this.cwd, this.out);

    if (toolIds.length === 0) {
      this.error('No AI tools detected in this directory.\n' +
        'Make sure your tool has a config file here (e.g. CLAUDE.md, AGENTS.md, .cursorrules).\n' +
        'Or add a tool manually: easyskillz tool register <tool>\n' +
        'Supported tools: claude, codex, cursor, windsurf, copilot, gemini');
    }

    // Plan wiring actions (skip confirmation if flags provided)
    const skipConfirm = this.hasFlags();
    const actions = await plan(this.cwd, toolIds, strategy, this.out, this.isTTY, skipConfirm);

    if (actions === null) {
      this.out('Aborted.');
      return;
    }

    // Execute wiring
    if (actions.length === 0) {
      this.out('Everything already wired. Nothing to do.');
    } else {
      execute(this.cwd, toolIds, strategy, actions, this.out);
      this.out('');
      this.out(`Done. ${toolIds.length} tool(s) wired via ${strategy}.`);
    }

    // Docs management
    await this.handleDocsManagement();

    // Gitignore management
    await this.handleGitignoreManagement(actions, toolIds);

    if (this.json) {
      this.jsonOutput({ 
        ok: true, 
        tools: toolIds, 
        strategy, 
        actions: actions.map((a) => a.type) 
      });
    }
  }

  async handleDocsManagement() {
    let cfg = config.read(this.cwd);
    
    if (cfg.manageDocs === false && cfg.docsStrategy === null) {
      // First time - get flag or prompt
      const docsAnswer = await this.getFlagOrPrompt(
        'docs',
        'Manage instruction files? [Y/n]: ',
        'project sync',
        'no'
      );

      const manageDocs = docsAnswer === 'yes' || docsAnswer.toLowerCase() === 'y';
      let docsStrategy = null;

      if (manageDocs) {
        // Get strategy
        const strategyAnswer = await this.getFlagOrPrompt(
          'docs-strategy',
          'Strategy? [1=unified, 2=tool-specific]: ',
          'project sync',
          'unified'
        );

        docsStrategy = strategyAnswer === '1' || strategyAnswer === 'unified' 
          ? 'unified' 
          : 'tool-specific';
      }

      // Save config
      cfg.manageDocs = manageDocs;
      cfg.docsStrategy = docsStrategy;
      config.write(this.cwd, cfg);

      // Centralize if enabled
      if (manageDocs) {
        this.out('');
        this.out('Scanning for instruction files...');
        const scanned = scanAll(this.cwd);
        const fileCount = Object.values(scanned).flat().length;
        
        if (fileCount > 0) {
          this.out(`Found ${fileCount} instruction file(s) in ${Object.keys(scanned).length} folder(s)`);
          this.out('Centralizing...');
          
          const centralizeActions = centralize(this.cwd, scanned, cfg.docsStrategy);
          this.out(`✓ Centralized ${centralizeActions.length} file(s) to .easyskillz/docs/`);
        } else {
          this.out('No existing instruction files found.');
        }
      }
    } else if (cfg.manageDocs === true) {
      // Auto-scan and centralize any new files
      const scanned = scanAll(this.cwd);
      const fileCount = Object.values(scanned).flat().length;
      
      if (fileCount > 0) {
        const centralizeActions = centralize(this.cwd, scanned, cfg.docsStrategy);
        if (centralizeActions.length > 0) {
          this.out('');
          this.out(`✓ Centralized ${centralizeActions.length} new instruction file(s)`);
        }
      }
    }
  }

  async handleGitignoreManagement(actions, toolIds) {
    let cfg = config.read(this.cwd);
    
    if (cfg.gitignoreStrategy === null) {
      const gitignoreAnswer = await this.getFlagOrPrompt(
        'gitignore',
        () => {
          this.out('');
          this.out('Choose Gitignore Strategy:');
          this.out('  1. full     - Blanket ignore tool folders (cleanest repo, but hides your hooks/custom files)');
          this.out('  2. smart    - Surgical ignore (only ignores managed skills/configs, keeps your custom files tracked)');
          this.out('  3. minimal  - Only ignore files that might cause merge conflicts');
          this.out('  4. none     - Manual management');
          this.out('');
          return 'Strategy? [1=full, 2=smart (recommended), 3=minimal, 4=none]: ';
        },
        'project sync',
        'smart'
      );

      let gitignoreStrategy;
      if (gitignoreAnswer === '1' || gitignoreAnswer === 'full') {
        gitignoreStrategy = 'full';
      } else if (gitignoreAnswer === '2' || gitignoreAnswer === 'smart') {
        gitignoreStrategy = 'smart';
      } else if (gitignoreAnswer === '3' || gitignoreAnswer === 'minimal' || gitignoreAnswer === 'conflict-only') {
        gitignoreStrategy = 'minimal';
      } else {
        gitignoreStrategy = 'none';
      }

      cfg.gitignoreStrategy = gitignoreStrategy;
      config.write(this.cwd, cfg);
    }

    // Apply gitignore if needed
    if (cfg.gitignoreStrategy && cfg.gitignoreStrategy !== 'none') {
      const toolEntries = toolIds.map((id) => registry[id]).filter(Boolean);
      const result = updateGitignore(this.cwd, toolEntries, cfg.gitignoreStrategy);
      
      if (result === 'updated') {
        this.out('');
        this.out(`  ✓ Updated .gitignore (${cfg.gitignoreStrategy} strategy)`);
      } else if (result === 'skipped') {
        this.out('');
        this.out('  ⊘ Skipped .gitignore (manual management)');
      }
    }
  }
}

module.exports = SyncCommand;
