'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { makeFixture, cleanupFixture } = require('../support/fixture');
const { runCli } = require('../support/cli');

/**
 * Create a unique temporary directory and initialize a git repo.
 */
function setupRepo() {
  const repoPath = makeFixture({
    'package.json': `${JSON.stringify({ name: 'e2e-test', version: '1.0.0' }, null, 2)}\n`,
  });
  
  execSync('git init', { cwd: repoPath, stdio: 'ignore' });
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
    fs.mkdirSync(path.dirname(markerPath), { recursive: true });
    fs.writeFileSync(markerPath, '{}', 'utf8');
  } else if (!fs.existsSync(markerPath)) {
    fs.mkdirSync(markerPath, { recursive: true });
  }
}

/**
 * Run easyskillz CLI in a specific directory.
 */
function runEZ(args, cwd, env = {}) {
  const tokens = Array.isArray(args) ? args : String(args).trim().split(/\s+/).filter(Boolean);
  const result = runCli(tokens, { cwd, env });
  return {
    ok: result.status === 0,
    output: result.stdout,
    stdout: result.stdout,
    stderr: result.stderr,
    status: result.status,
    error: result.error,
  };
}

/**
 * Clean up a directory.
 */
function cleanup(repoPath) {
  if (repoPath && fs.existsSync(repoPath)) {
    cleanupFixture(repoPath);
  }
}

module.exports = {
  setupRepo,
  mockTool,
  runEZ,
  cleanup
};
