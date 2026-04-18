'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const BIN = path.resolve(__dirname, '../../bin/easyskillz.js');

/**
 * Create a unique temporary directory and initialize a git repo.
 */
function setupRepo() {
  const tmpBase = path.join(os.tmpdir(), 'easyskillz-e2e-');
  const repoPath = fs.mkdtempSync(tmpBase);
  
  execSync('git init', { cwd: repoPath, stdio: 'ignore' });
  fs.writeFileSync(path.join(repoPath, 'package.json'), JSON.stringify({
    name: 'e2e-test',
    version: '1.0.0'
  }, null, 2));
  
  return repoPath;
}

/**
 * Mock an AI tool installation by creating its markers.
 */
function mockTool(repoPath, toolId) {
  const registry = require('../../src/registry');
  const entry = registry[toolId];
  if (!entry) throw new Error(`Unknown tool: ${toolId}`);
  
  // Create base dir
  const baseDir = entry.skillsDir.split('/')[0];
  if (baseDir !== '.') {
    fs.mkdirSync(path.join(repoPath, baseDir), { recursive: true });
  }
  
  // Create one specific marker (e.g. settings.json or folder)
  const marker = entry.detectionMarkers[0];
  const markerPath = path.join(repoPath, marker);
  if (marker.endsWith('.json')) {
    fs.writeFileSync(markerPath, '{}', 'utf8');
  } else if (!fs.existsSync(markerPath)) {
    fs.mkdirSync(markerPath, { recursive: true });
  }
}

/**
 * Run easyskillz CLI in a specific directory.
 */
function runEZ(args, cwd) {
  try {
    const output = execSync(`node "${BIN}" ${args}`, { cwd, encoding: 'utf8' });
    return { ok: true, output };
  } catch (e) {
    return { ok: false, output: e.stdout + e.stderr, status: e.status };
  }
}

/**
 * Clean up a directory.
 */
function cleanup(repoPath) {
  if (repoPath && fs.existsSync(repoPath)) {
    fs.rmSync(repoPath, { recursive: true, force: true });
  }
}

module.exports = {
  setupRepo,
  mockTool,
  runEZ,
  cleanup
};
