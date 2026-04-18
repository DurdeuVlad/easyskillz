'use strict';

const fs = require('fs');
const path = require('path');
const registry = require('../registry');

const INSTRUCTION_FILES = [
  'CLAUDE.md',
  'AGENTS.md',
  'GEMINI.md',
  'copilot-instructions.md',
];

function scanDirectory(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    // Skip hidden directories, node_modules, .git, etc.
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') {
        continue;
      }
      scanDirectory(fullPath, results);
    } else if (entry.isFile() && INSTRUCTION_FILES.includes(entry.name)) {
      results.push(fullPath);
    }
  }
  
  return results;
}

function scanAll(cwd) {
  const found = scanDirectory(cwd);
  
  // Group by directory
  const byDir = {};
  for (const filePath of found) {
    const dir = path.dirname(filePath);
    const relDir = path.relative(cwd, dir) || '.';
    const fileName = path.basename(filePath);
    
    if (!byDir[relDir]) {
      byDir[relDir] = [];
    }
    byDir[relDir].push(fileName);
  }
  
  return byDir;
}

module.exports = { scanAll };
