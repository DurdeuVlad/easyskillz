'use strict';

const fs = require('fs');
const path = require('path');
const registry = require('../registry');
const { MANAGED_OPEN, MANAGED_CLOSE, MANAGED_BLOCK } = require('./syncFolder');

const DOCS_DIR = '.easyskillz/docs';
const POINTER_RE = /^<!-- Managed by easyskillz -->\s*<!-- See: .*? -->\s*$/s;

function getToolForFile(fileName) {
  for (const [toolId, entry] of Object.entries(registry)) {
    const instructionFileName = path.basename(entry.instructionFile);
    if (instructionFileName === fileName) {
      return { toolId, entry };
    }
  }
  return null;
}

function stripManagedBlock(content) {
  let next = content;
  while (next.includes(MANAGED_OPEN)) {
    const start = next.indexOf(MANAGED_OPEN);
    const end = next.indexOf(MANAGED_CLOSE, start);
    if (end === -1) break;
    next = next.slice(0, start) + next.slice(end + MANAGED_CLOSE.length);
  }
  return next.trim();
}

function cleanInstructionContent(content) {
  const trimmed = content.trim();
  if (!trimmed || POINTER_RE.test(trimmed)) return '';
  return stripManagedBlock(trimmed);
}

function composeManagedContent(parts) {
  const body = parts.map((part) => part.trim()).filter(Boolean).join('\n\n');
  return body ? `${body}\n\n${MANAGED_BLOCK}\n` : `${MANAGED_BLOCK}\n`;
}

function replaceWithManagedFile(filePath, centralFile, content) {
  fs.rmSync(filePath, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  try {
    fs.symlinkSync(path.relative(path.dirname(filePath), centralFile), filePath);
    return 'symlink';
  } catch {
    fs.writeFileSync(filePath, content, 'utf8');
    return 'copy';
  }
}

function centralizeUnified(cwd, scannedFiles) {
  const actions = [];

  for (const [relDir, fileNames] of Object.entries(scannedFiles)) {
    const sourceDir = relDir === '.' ? cwd : path.join(cwd, relDir);
    const docsPath = path.join(cwd, DOCS_DIR, relDir);
    const centralFile = path.join(docsPath, 'INSTRUCTION.md');
    const mergedParts = [];
    const filesToReplace = [];

    for (const fileName of fileNames) {
      const filePath = path.join(sourceDir, fileName);
      if (!fs.existsSync(filePath)) continue;

      const content = cleanInstructionContent(fs.readFileSync(filePath, 'utf8'));
      if (content) mergedParts.push(`<!-- From ${fileName} -->\n${content}`);
      filesToReplace.push({ fileName, filePath });
    }

    fs.mkdirSync(docsPath, { recursive: true });
    const centralContent = composeManagedContent(mergedParts);
    fs.writeFileSync(centralFile, centralContent, 'utf8');

    for (const { filePath } of filesToReplace) {
      const type = replaceWithManagedFile(filePath, centralFile, centralContent);
      actions.push({ type, from: filePath, to: centralFile });
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

      const cleaned = cleanInstructionContent(fs.readFileSync(filePath, 'utf8'));
      const centralContent = composeManagedContent(cleaned ? [`<!-- From ${fileName} -->\n${cleaned}`] : []);

      fs.mkdirSync(docsPath, { recursive: true });
      fs.writeFileSync(centralFile, centralContent, 'utf8');

      const type = replaceWithManagedFile(filePath, centralFile, centralContent);
      actions.push({ type, from: filePath, to: centralFile });
    }
  }

  return actions;
}

function centralize(cwd, scannedFiles, strategy) {
  if (strategy === 'unified') {
    return centralizeUnified(cwd, scannedFiles);
  }
  return centralizeToolSpecific(cwd, scannedFiles);
}

module.exports = {
  centralize,
  DOCS_DIR,
  getToolForFile,
  cleanInstructionContent,
};
