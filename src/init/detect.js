'use strict';

const config = require('../config');
const wirer = require('../wirer');

const DETECTORS = {
  claude:   require('../detectors/claude'),
  codex:    require('../detectors/codex'),
  cursor:   require('../detectors/cursor'),
  windsurf: require('../detectors/windsurf'),
  copilot:  require('../detectors/copilot'),
  gemini:   require('../detectors/gemini'),
};

// Scan for installed tools, read existing config, probe symlink support.
// Returns { toolIds, strategy, found, notFound, existingConfig }
function detect(cwd, out) {
  out('Scanning for AI tools...');
  const detected = Object.values(DETECTORS).map((fn) => fn(cwd));
  const found = detected.filter((d) => d.found);
  const notFound = detected.filter((d) => !d.found);

  for (const d of found)    out(`  ✓ ${d.entry.name.padEnd(16)} (${d.entry.skillsDir})`);
  for (const d of notFound) out(`  ✗ ${d.entry.name.padEnd(16)} (not found)`);
  out('');

  const existingConfig = config.read(cwd);
  const hasExistingConfig = existingConfig.tools.length > 0;

  let toolIds;
  if (hasExistingConfig) {
    out('Reading config (.easyskillz/easyskillz.json)...');
    out(`  Registered: ${existingConfig.tools.join(', ')}`);
    out(`  Strategy:   ${existingConfig.linkStrategy}`);
    out('');
    const merged = new Set(existingConfig.tools);
    for (const d of found) merged.add(d.id);
    toolIds = [...merged];
  } else {
    toolIds = found.map((d) => d.id);
  }

  out('Testing symlink support...');
  const symlinkOk = wirer.probeSymlinks();
  const strategy = symlinkOk ? 'symlink' : 'stub';
  out(`  ${symlinkOk ? '✓ symlinks work' : '✗ symlinks unavailable — will use stub .md files'}`);
  out('');

  return { toolIds, strategy, found, notFound, existingConfig };
}

module.exports = detect;
