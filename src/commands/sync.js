'use strict';

const detect  = require('../init/detect');
const { plan } = require('../init/plan');
const execute = require('../init/execute');
const config = require('../config');
const registry = require('../registry');
const { promptDocsSetup } = require('../docs/promptDocsSetup');
const { scanAll } = require('../docs/scanInstructionFiles');
const { centralize } = require('../docs/centralizeFiles');
const { promptGitignoreSetup } = require('../gitignore/promptGitignoreSetup');
const { updateGitignore } = require('../gitignore/updateGitignore');

async function sync({ cwd, json, isTTY }) {
  const out = json ? () => {} : (s) => process.stdout.write(s + '\n');

  const { toolIds, strategy, existingConfig } = detect(cwd, out);

  if (toolIds.length === 0) {
    out('No AI tools detected in this directory.');
    out('Make sure your tool has a config file here (e.g. CLAUDE.md, AGENTS.md, .cursorrules).');
    out('Or add a tool manually: easyskillz register <tool>');
    out('Supported tools: claude, codex, cursor, windsurf, windsurf-workflows, copilot, gemini');
    if (json) process.stdout.write(JSON.stringify({ ok: false, tools: [], strategy: null }) + '\n');
    process.exit(1);
    return;
  }

  const actions = await plan(cwd, toolIds, strategy, out, isTTY);

  if (actions === null) {
    out('Aborted.');
    process.exit(0);
  }

  // Execute wiring actions if any
  if (actions.length === 0) {
    out('Everything already wired. Nothing to do.');
  } else {
    execute(cwd, toolIds, strategy, actions, out);
    out('');
    out(`Done. ${toolIds.length} tool(s) wired via ${strategy}.`);
  }

  // Docs management
  let cfg = config.read(cwd);
  
  if (cfg.manageDocs === false && cfg.docsStrategy === null && isTTY) {
    // First time - prompt for docs setup
    const docsChoice = await promptDocsSetup();
    
    if (docsChoice.manageDocs) {
      cfg.manageDocs = true;
      cfg.docsStrategy = docsChoice.docsStrategy;
      config.write(cwd, cfg);
      
      out('');
      out('Scanning for instruction files...');
      const scanned = scanAll(cwd);
      const fileCount = Object.values(scanned).flat().length;
      
      if (fileCount > 0) {
        out(`Found ${fileCount} instruction file(s) in ${Object.keys(scanned).length} folder(s)`);
        out('Centralizing...');
        
        const centralizeActions = centralize(cwd, scanned, cfg.docsStrategy);
        out(`✓ Centralized ${centralizeActions.length} file(s) to .easyskillz/docs/`);
      } else {
        out('No existing instruction files found.');
      }
    } else {
      cfg.manageDocs = false;
      config.write(cwd, cfg);
    }
  } else if (cfg.manageDocs === true) {
    // Auto-scan and centralize any new files
    const scanned = scanAll(cwd);
    const fileCount = Object.values(scanned).flat().length;
    
    if (fileCount > 0) {
      const centralizeActions = centralize(cwd, scanned, cfg.docsStrategy);
      if (centralizeActions.length > 0) {
        out('');
        out(`✓ Centralized ${centralizeActions.length} new instruction file(s)`);
      }
    }
  }

  // Gitignore management (prompt on first run if strategy not set)
  cfg = config.read(cwd);
  
  if (cfg.gitignoreStrategy === null) {
    if (isTTY) {
      const gitignoreChoice = await promptGitignoreSetup();
      cfg.gitignoreStrategy = gitignoreChoice.gitignoreStrategy;
    } else {
      // Non-TTY mode: default to 'full' (safest option)
      cfg.gitignoreStrategy = 'full';
    }
    config.write(cwd, cfg);
  }

  // Apply gitignore if needed and strategy is set
  if (actions.some((a) => a.type === 'gitignore') && cfg.gitignoreStrategy) {
    const toolEntries = toolIds.map((id) => registry[id]).filter(Boolean);
    const result = updateGitignore(cwd, toolEntries, cfg.gitignoreStrategy);
    
    if (result === 'updated') {
      out('');
      out(`  ✓ Updated .gitignore (${cfg.gitignoreStrategy} strategy)`);
    } else if (result === 'skipped') {
      out('');
      out('  ⊘ Skipped .gitignore (manual management)');
    }
  }

  if (json) {
    process.stdout.write(JSON.stringify({ ok: true, tools: toolIds, strategy, actions: actions.map((a) => a.type) }) + '\n');
  }
}

module.exports = sync;
