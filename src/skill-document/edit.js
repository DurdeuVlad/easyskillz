'use strict';

const fs = require('fs');
const path = require('path');

function createDiff(filePath, original, updated) {
  if (original === updated) return '';
  const lines = [`--- ${filePath}`, `+++ ${filePath}`, '@@'];
  for (const line of original.split(/(?<=\n)/)) lines.push(`-${line.replace(/\n$/, '')}`);
  for (const line of updated.split(/(?<=\n)/)) lines.push(`+${line.replace(/\n$/, '')}`);
  return lines.join('\n') + '\n';
}

function createEditPreview({ filePath, original, updated, operation }) {
  return Object.freeze({
    filePath,
    original,
    updated,
    operation,
    changed: original !== updated,
    diff: createDiff(filePath, original, updated),
  });
}

function atomicWrite(filePath, content) {
  const temporaryPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.easyskillz-${process.pid}-${Date.now()}.tmp`
  );
  fs.writeFileSync(temporaryPath, content, 'utf8');
  fs.renameSync(temporaryPath, filePath);
}

function applyEdit(preview, { write = false, backupRoot } = {}) {
  if (!write || !preview.changed) return { ...preview, applied: false, backupPath: null };
  if (!backupRoot) throw new Error('backupRoot is required when applying a skill document edit.');

  const backupPath = path.join(backupRoot, path.basename(preview.filePath));
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  atomicWrite(backupPath, preview.original);
  atomicWrite(preview.filePath, preview.updated);
  return { ...preview, applied: true, backupPath };
}

module.exports = { applyEdit, createEditPreview };
