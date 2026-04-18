'use strict';

const fs = require('fs');
const path = require('path');
const registry = require('../registry');

const DOCS_DIR = '.easyskillz/docs';

function getToolForFile(fileName) {
  for (const [toolId, entry] of Object.entries(registry)) {
    const instructionFileName = path.basename(entry.instructionFile);
    if (instructionFileName === fileName) {
      return { toolId, entry };
    }
  }
  return null;
}

function centralizeUnified(cwd, scannedFiles) {
  const actions = [];
  
  for (const [relDir, fileNames] of Object.entries(scannedFiles)) {
    const sourceDir = relDir === '.' ? cwd : path.join(cwd, relDir);
    const docsPath = path.join(cwd, DOCS_DIR, relDir);
    const centralFile = path.join(docsPath, 'INSTRUCTION.md');
    
    // Merge content from all instruction files in this directory
    let mergedContent = '';
    const filesToReplace = [];
    
    for (const fileName of fileNames) {
      const filePath = path.join(sourceDir, fileName);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8').trim();
        if (content) {
          if (mergedContent) mergedContent += '\n\n';
          mergedContent += `<!-- From ${fileName} -->\n${content}`;
        }
        filesToReplace.push({ fileName, filePath });
      }
    }
    
    // Write centralized file
    fs.mkdirSync(docsPath, { recursive: true });
    fs.writeFileSync(centralFile, mergedContent + '\n', 'utf8');
    
    // Replace originals with symlinks
    for (const { fileName, filePath } of filesToReplace) {
      fs.unlinkSync(filePath);
      
      try {
        fs.symlinkSync(path.relative(path.dirname(filePath), centralFile), filePath);
        actions.push({ type: 'symlink', from: filePath, to: centralFile });
      } catch (err) {
        // Fallback: recreate file with pointer
        fs.writeFileSync(filePath, `<!-- Managed by easyskillz -->\n<!-- See: ${centralFile} -->\n`, 'utf8');
        actions.push({ type: 'stub', from: filePath, to: centralFile });
      }
    }
  }
  
  return actions;
}

function centralizeToolSpecific(cwd, scannedFiles) {
  const actions = [];
  
  for (const [relDir, fileNames] of Object.entries(scannedFiles)) {
    const sourceDir = relDir === '.' ? cwd : path.join(cwd, relDir);
    const docsPath = path.join(cwd, DOCS_DIR, relDir);
    
    for (const fileName of fileNames) {
      const filePath = path.join(sourceDir, fileName);
      const centralFile = path.join(docsPath, fileName);
      
      if (!fs.existsSync(filePath)) continue;
      
      // Copy content to centralized location
      const content = fs.readFileSync(filePath, 'utf8');
      fs.mkdirSync(docsPath, { recursive: true });
      fs.writeFileSync(centralFile, content, 'utf8');
      
      // Replace with symlink
      fs.unlinkSync(filePath);
      
      try {
        fs.symlinkSync(path.relative(path.dirname(filePath), centralFile), filePath);
        actions.push({ type: 'symlink', from: filePath, to: centralFile });
      } catch (err) {
        // Fallback: recreate file with pointer
        fs.writeFileSync(filePath, `<!-- Managed by easyskillz -->\n<!-- See: ${centralFile} -->\n`, 'utf8');
        actions.push({ type: 'stub', from: filePath, to: centralFile });
      }
    }
  }
  
  return actions;
}

function centralize(cwd, scannedFiles, strategy) {
  if (strategy === 'unified') {
    return centralizeUnified(cwd, scannedFiles);
  } else {
    return centralizeToolSpecific(cwd, scannedFiles);
  }
}

module.exports = { centralize, DOCS_DIR };
