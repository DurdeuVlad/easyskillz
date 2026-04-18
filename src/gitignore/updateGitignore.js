'use strict';

const fs = require('fs');
const path = require('path');

const START_MARKER = '# easyskillz-start';
const END_MARKER = '# easyskillz-end';

function updateGitignore(cwd, toolEntries, strategy) {
  if (!strategy || strategy === 'none') {
    return 'skipped';
  }

  const filePath = path.join(cwd, '.gitignore');
  let content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  
  let lines = [];
  lines.push(START_MARKER);
  lines.push(`# strategy: ${strategy}`);

  if (strategy === 'full') {
    const managedItems = new Set();
    toolEntries.forEach((e) => {
      const parts = e.skillsDir.split('/');
      const baseDir = parts[0];
      
      if (baseDir === '.github') {
        // Don't ignore all of .github (actions, etc)
        managedItems.add(e.skillsDir + '/');
        // Surgical ignore of tool config files (managed by easyskillz logic)
        if (e.configFiles && e.configFiles.length > 0) {
          e.configFiles.forEach((cf) => managedItems.add(cf));
        }
      } else if (baseDir.startsWith('.')) {
        // Ignore root of hidden tool folders (.claude, .cursor, etc)
        managedItems.add(baseDir + '/');
      } else {
        // Fallback to surgical for non-hidden or unexpected paths
        managedItems.add(e.skillsDir + '/');
        // Surgical ignore of tool config files
        if (e.configFiles && e.configFiles.length > 0) {
          e.configFiles.forEach((cf) => managedItems.add(cf));
        }
      }
    });
    
    lines.push(...Array.from(managedItems).sort());
    
    // 3. Surgical ignore of instruction files
    const instrFiles = [...new Set(toolEntries.map((e) => e.instructionFile))];
    instrFiles.forEach((file) => {
      if (file.includes('/')) {
        lines.push(file);
      } else {
        lines.push('**/' + file);
      }
    });
  } else if (strategy === 'conflict-only') {
    const configFiles = new Set();
    toolEntries.forEach((e) => {
      if (e.configFiles && e.configFiles.length > 0) {
        e.configFiles.forEach((cf) => configFiles.add(cf));
      }
    });
    
    if (configFiles.size > 0) {
      lines.push(...Array.from(configFiles).sort());
    }
  }
  
  lines.push(END_MARKER);
  const newBlock = lines.join('\n');

  if (content.includes(START_MARKER)) {
    // Update existing block
    const startIndex = content.indexOf(START_MARKER);
    const endIndex = content.indexOf(END_MARKER);
    if (endIndex !== -1) {
      const before = content.substring(0, startIndex);
      const after = content.substring(endIndex + END_MARKER.length);
      const updated = (before + newBlock + after).replace(/\n\n\n+/g, '\n\n');
      if (updated === content) return 'already';
      fs.writeFileSync(filePath, updated, 'utf8');
      return 'updated';
    }
  }
  
  // Handle old-style marker if it exists
  const oldMarker = '# easyskillz';
  if (content.includes(oldMarker) && !content.includes(START_MARKER)) {
    // Migration: just append new block for now, or replace old line?
    // Let's replace the old line if it's there
    content = content.replace(new RegExp(`^${oldMarker}.*$`, 'm'), '');
  }

  // Append new block
  const separator = content.length > 0 && !content.endsWith('\n') ? '\n\n' : '\n';
  fs.appendFileSync(filePath, separator + newBlock + '\n', 'utf8');
  return 'updated';
}

module.exports = { updateGitignore };
