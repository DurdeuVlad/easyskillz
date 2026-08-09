'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const TEST_ROOT = path.join(ROOT, 'tests');
const REQUIRED = Array.from({ length: 31 }, (_, index) => `AC-${String(index + 1).padStart(2, '0')}`);

function testFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return testFiles(file);
    return entry.isFile() && entry.name.endsWith('.test.js') ? [file] : [];
  });
}

const covered = new Map();
for (const file of testFiles(TEST_ROOT)) {
  const content = fs.readFileSync(file, 'utf8');
  for (const title of content.matchAll(/\b(?:test|it)\s*\(\s*(['"`])([^\r\n]*?)\1/g)) {
    for (const id of title[2].matchAll(/\bAC-(\d{2})\b/g)) {
      const normalized = `AC-${id[1]}`;
      if (!covered.has(normalized)) covered.set(normalized, []);
      covered.get(normalized).push(path.relative(ROOT, file).replaceAll(path.sep, '/'));
    }
  }
}

const missing = REQUIRED.filter((id) => !covered.has(id));
if (missing.length) {
  process.stderr.write(`Missing acceptance coverage: ${missing.join(', ')}\n`);
  process.exitCode = 1;
} else {
  for (const id of REQUIRED) process.stdout.write(`${id}: ${covered.get(id).join(', ')}\n`);
}
