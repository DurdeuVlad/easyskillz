'use strict';

const fs = require('fs');
const path = require('path');

function updateGitignore(cwd, toolEntries, strategy) {
  if (!strategy || strategy === 'none') {
    return 'skipped';
  }

  const filePath = path.join(cwd, '.gitignore');
  let existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  
  // Check for any easyskillz marker (old or new)
  const marker = '# easyskillz';
  if (existing.includes(marker)) {
    return 'already';
  }

  let lines = [];

  if (strategy === 'full') {
    lines.push('');
    lines.push('# easyskillz — full gitignore (regenerate with `easyskillz sync`)');
    
    const toolDirs = new Set();
    toolEntries.forEach((e) => {
      const baseDir = e.skillsDir.split('/')[0];
      toolDirs.add(baseDir + '/');
    });
    
    lines.push(...Array.from(toolDirs).sort());
    lines.push('');
    
    const instrFiles = [...new Set(toolEntries.map((e) => e.instructionFile))];
    instrFiles.forEach((file) => {
      if (file.includes('/')) {
        lines.push(file);
      } else {
        lines.push('**/' + file);
      }
    });
    lines.push('');
  } else if (strategy === 'conflict-only') {
    const configFiles = new Set();
    toolEntries.forEach((e) => {
      if (e.configFiles && e.configFiles.length > 0) {
        e.configFiles.forEach((cf) => configFiles.add(cf));
      }
    });
    
    if (configFiles.size > 0) {
      lines.push('');
      lines.push('# easyskillz — conflict-generating files only');
      lines.push('');
      lines.push(...Array.from(configFiles).sort());
      lines.push('');
    }
  }

  if (lines.length > 0) {
    fs.appendFileSync(filePath, lines.join('\n'), 'utf8');
    return 'updated';
  }

  return 'nothing';
}

module.exports = { updateGitignore };
