'use strict';

const fs = require('fs');
const path = require('path');

const START_MARKER = '# easyskillz-start';
const END_MARKER = '# easyskillz-end';
const LEGACY_GENERATED_DIRS = ['.codex/skills', '.cursor/skills'];

function updateGitignore(cwd, toolEntries, strategy) {
  if (!strategy || strategy === 'none') {
    return 'skipped';
  }

  const filePath = path.join(cwd, '.gitignore');
  let content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  
  let lines = [];
  lines.push(START_MARKER);
  lines.push(`# strategy: ${strategy}`);

  if (strategy === 'full' || strategy === 'smart') {
    // 1. Group managed items by their base directory (e.g., ".claude")
    const dirMap = new Map();
    toolEntries.forEach((e) => {
      const managedTargets = (e.skillTargets || [{ path: e.skillsDir }]).map((target) => target.path);
      const addManaged = (managedPath) => {
        const baseDir = managedPath.split('/')[0];
        if (!dirMap.has(baseDir)) dirMap.set(baseDir, new Set());
        dirMap.get(baseDir).add(managedPath);
      };

      managedTargets.forEach(addManaged);
      LEGACY_GENERATED_DIRS.forEach(addManaged);
      if (e.configFiles) e.configFiles.forEach(addManaged);
    });

    const linesToIgnore = new Set();
    
    // 2. Decide strategy for each base directory
    dirMap.forEach((managedSet, baseDir) => {
      const fullBaseDir = path.join(cwd, baseDir);
      let useSurgical = (strategy === 'smart'); // Smart is always surgical

      if (baseDir === '.github') {
        useSurgical = true;
      } else if (strategy === 'full' && baseDir.startsWith('.') && fs.existsSync(fullBaseDir)) {
        // Full mode: blanket ignore root UNLESS unmanaged files found
        try {
          const files = fs.readdirSync(fullBaseDir);
          for (const f of files) {
            const relPath = `${baseDir}/${f}`;
            const isManaged = Array.from(managedSet).some(m => {
              return m === relPath || m.startsWith(relPath + '/');
            });
            if (!isManaged) {
              useSurgical = true; // Smart switch!
              break;
            }
          }
        } catch {
          useSurgical = true;
        }
      } else if (!baseDir.startsWith('.')) {
        useSurgical = true;
      }

      if (useSurgical) {
        // Surgical: Add specific managed items only
        managedSet.forEach(m => {
          const isDir = m.includes('/skills') || m.includes('/workflows') || m.includes('/rules');
          linesToIgnore.add(isDir ? m + '/' : m);
        });
      } else {
        // Blanket: Ignore root of tool folder
        linesToIgnore.add(baseDir + '/');
      }
    });

    lines.push(...Array.from(linesToIgnore).sort());
    
    // 3. Surgical ignore of instruction files
    const instrFiles = [...new Set(toolEntries.map((e) => e.instructionFile))];
    instrFiles.forEach((file) => {
      if (file.includes('/')) {
        lines.push(file);
      } else {
        lines.push('**/' + file);
      }
    });
  } else if (strategy === 'minimal') {
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
