'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const config = require('../config');
const registry = require('../registry');
const { isAIAgent, showAIWarning } = require('../utils/detectAI');

function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function unregister(toolId, cwd, opts = {}) {
  const out = opts.out || console.log;
  const json = opts.json || false;
  const mode = opts.mode || null; // 'full' or 'revert'
  const confirm = opts.confirm || false;
  
  const entry = registry[toolId];
  if (!entry) {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: `Unknown tool: ${toolId}` }));
    } else {
      out(`Error: Unknown tool "${toolId}".`);
      out('');
      out('Supported tools: ' + Object.keys(registry).join(', '));
    }
    process.exit(1);
  }
  
  const cfg = config.read(cwd);
  
  // Check if tool is registered
  if (!cfg.tools || !cfg.tools.includes(toolId)) {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: `Tool "${toolId}" is not registered` }));
    } else {
      out(`Tool "${entry.name}" is not registered in this project.`);
    }
    process.exit(1);
  }
  
  let selectedMode = mode;
  
  // If mode not specified and AI detected, show warning
  if (!selectedMode && isAIAgent()) {
    showAIWarning('tool unregister');
    process.exit(1);
  }
  
  // If mode not specified, ask interactively
  if (!selectedMode) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    out('');
    out(`How should ${entry.name} be unregistered?`);
    out('');
    out('1. Full delete (remove from config + delete tool directory)');
    out('2. Revert (remove from config, keep tool files)');
    out('');
    
    const answer = await ask(rl, 'Choice [1/2]: ');
    rl.close();
    
    if (answer === '1') {
      selectedMode = 'full';
    } else if (answer === '2') {
      selectedMode = 'revert';
    } else {
      out('Invalid choice. Cancelled.');
      process.exit(0);
    }
  }
  
  // Validate mode
  if (selectedMode !== 'full' && selectedMode !== 'revert') {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: 'Invalid mode. Use "full" or "revert"' }));
    } else {
      out('Error: Invalid mode. Use --mode=full or --mode=revert');
    }
    process.exit(1);
  }
  
  // If not confirmed and AI detected, show warning
  if (!confirm && isAIAgent()) {
    showAIWarning('tool unregister');
    process.exit(1);
  }
  
  // If not confirmed, ask for confirmation
  if (!confirm) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    out('');
    out('This will:');
    out(`  - Remove "${toolId}" from .easyskillz/easyskillz.json`);
    
    if (selectedMode === 'full') {
      const toolDir = path.join(cwd, entry.skillsDir.split('/')[0]);
      out(`  - Delete ${toolDir}/ directory and all contents`);
    } else {
      out(`  - Keep ${entry.skillsDir.split('/')[0]}/ directory intact`);
    }
    
    out('');
    const answer = await ask(rl, 'Are you sure? [y/N]: ');
    rl.close();
    
    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      out('Cancelled.');
      process.exit(0);
    }
  }
  
  // Remove tool from config
  cfg.tools = cfg.tools.filter(t => t !== toolId);
  config.write(cwd, cfg);
  
  let deletedDir = false;
  
  // If full mode, delete tool directory
  if (selectedMode === 'full') {
    const toolDir = path.join(cwd, entry.skillsDir.split('/')[0]);
    if (fs.existsSync(toolDir)) {
      fs.rmSync(toolDir, { recursive: true, force: true });
      deletedDir = true;
    }
  }
  
  if (json) {
    console.log(JSON.stringify({
      ok: true,
      tool: toolId,
      unregistered: true,
      mode: selectedMode,
      directoryDeleted: deletedDir,
    }));
  } else {
    out('');
    out(`✓ Unregistered ${entry.name} (${selectedMode} mode)`);
    if (deletedDir) {
      out(`✓ Deleted ${entry.skillsDir.split('/')[0]}/ directory`);
    }
  }
}

module.exports = unregister;
