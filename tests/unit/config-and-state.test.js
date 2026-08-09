'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const config = require('../../src/config');
const state = require('../../src/state');
const { validateSchema2, normalizeLegacy } = require('../../src/config/schema');
const { makeFixture, cleanupFixture } = require('../support/fixture');

test('AC-18: missing config is explicit and not confused with malformed content', () => {
  const root = makeFixture();
  try {
    const result = config.read(root);
    assert.equal(result.ok, true);
    assert.equal(result.kind, 'missing');
    assert.equal(result.config.schemaVersion, 2);
  } finally { cleanupFixture(root); }
});

test('AC-18: schema 2 config rejects unknown fields and values', () => {
  const root = makeFixture({
    '.easyskillz/easyskillz.json': JSON.stringify({ schemaVersion: 2, tools: ['claude'], materialization: 'magic', instructions: { mappings: [] }, surprise: true }),
  });
  try {
    const result = config.read(root);
    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'E_CONFIG_SCHEMA');
    assert.match(result.error.message, /materialization|unknown/i);
  } finally { cleanupFixture(root); }
});

test('AC-18: malformed JSON never silently falls back to defaults', () => {
  const root = makeFixture({ '.easyskillz/easyskillz.json': '{ nope' });
  try {
    const result = config.read(root);
    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'E_CONFIG_PARSE');
    assert.equal(result.config, undefined);
  } finally { cleanupFixture(root); }
});

test('AC-18/19: unsupported legacy host intent is diagnosed without mutating bytes', () => {
  const raw = JSON.stringify({ tools: ['gemini', 'windsurf'], linkStrategy: 'symlink', manageDocs: true, docsStrategy: 'unified' }, null, 2);
  const root = makeFixture({ '.easyskillz/easyskillz.json': raw });
  try {
    const result = config.read(root);
    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'E_CONFIG_LEGACY_SURFACE');
    assert.deepEqual(result.error.details, { surfaces: ['windsurf'], outputsPreserved: ['.windsurf/skills', '.windsurf/workflows'] });
    assert.equal(fs.readFileSync(path.join(root, '.easyskillz/easyskillz.json'), 'utf8'), raw);
  } finally { cleanupFixture(root); }
});

test('state round-trips schema and consumer sets atomically', () => {
  const root = makeFixture();
  try {
    const value = state.emptyState();
    value.artifacts['.agents/skills/demo'] = {
      source: '.easyskillz/skills/demo', sourceHash: 'a', kind: 'copy', outputHash: 'b', generator: 'native@1', consumers: ['antigravity', 'codex'],
    };
    state.write(root, value);
    assert.deepEqual(state.read(root), { ok: true, kind: 'state', state: value });
  } finally { cleanupFixture(root); }
});

test('invalid local state disables ownership instead of granting cleanup authority', () => {
  const root = makeFixture({ '.easyskillz/state.json': '{bad' });
  try {
    const result = state.read(root);
    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'E_STATE_INVALID');
    assert.equal(result.state, undefined);
  } finally { cleanupFixture(root); }
});

test('schema validation rejects every malformed structural branch', () => {
  const base = { schemaVersion: 2, tools: [], materialization: 'auto', instructions: { mappings: [] } };
  for (const value of [null, [], 'config']) {
    assert.equal(validateSchema2(value).error.code, 'E_CONFIG_SCHEMA');
  }
  assert.equal(validateSchema2({ ...base, schemaVersion: 1 }).error.code, 'E_CONFIG_SCHEMA');
  assert.equal(validateSchema2({ ...base, tools: 'claude' }).error.code, 'E_CONFIG_SCHEMA');
  assert.equal(validateSchema2({ ...base, tools: [7] }).error.code, 'E_CONFIG_SCHEMA');
  assert.equal(validateSchema2({ ...base, tools: ['unknown'] }).error.code, 'E_CONFIG_VALUE');
  assert.equal(validateSchema2({ ...base, tools: ['devin-desktop'] }).error.code, 'E_CONFIG_VALUE');
  assert.equal(validateSchema2({ ...base, materialization: 'stub' }).error.code, 'E_CONFIG_VALUE');
  assert.equal(validateSchema2({ ...base, instructions: null }).error.code, 'E_CONFIG_SCHEMA');
  assert.equal(validateSchema2({ ...base, instructions: [] }).error.code, 'E_CONFIG_SCHEMA');
  assert.equal(validateSchema2({ ...base, instructions: { mappings: [], extra: true } }).error.code, 'E_CONFIG_SCHEMA');
  assert.equal(validateSchema2({ ...base, instructions: { mappings: {} } }).error.code, 'E_CONFIG_SCHEMA');
});

test('schema 2 accepts exactly the seven retained surfaces', () => {
  const tools = ['claude', 'codex', 'copilot', 'gemini-cli', 'antigravity', 'cursor', 'devin'];
  const result = validateSchema2({ schemaVersion: 2, tools, materialization: 'auto', instructions: { mappings: [] } });
  assert.equal(result.ok, true);
  assert.deepEqual(result.config.tools, tools);
});

test('legacy normalization covers defaults, copy migration, invalid IDs, and deduplication', () => {
  assert.equal(normalizeLegacy(null).error.code, 'E_CONFIG_SCHEMA');
  assert.equal(normalizeLegacy({ tools: 'claude' }).error.code, 'E_CONFIG_SCHEMA');
  assert.equal(normalizeLegacy({ tools: ['unknown'] }).error.code, 'E_CONFIG_VALUE');
  assert.equal(normalizeLegacy({ tools: ['windsurf'] }).error.code, 'E_CONFIG_LEGACY_SURFACE');
  assert.deepEqual(normalizeLegacy({}).config, {
    schemaVersion: 2, tools: [], materialization: 'auto', instructions: { mappings: [] },
  });
  assert.deepEqual(normalizeLegacy({ tools: ['gemini', 'gemini'], linkStrategy: 'stub' }).config.tools, ['antigravity']);
  assert.equal(normalizeLegacy({ linkStrategy: 'stub' }).config.materialization, 'copy');
});

test('state schema rejects missing and malformed ownership structures', () => {
  assert.equal(state.validate(null), false);
  assert.equal(state.validate({ schemaVersion: 2, artifacts: {}, docs: {} }), false);
  assert.equal(state.validate({ schemaVersion: 1, artifacts: [], docs: {} }), false);
  assert.equal(state.validate({ schemaVersion: 1, artifacts: {}, docs: [] }), false);
  assert.equal(state.validate({ schemaVersion: 1, artifacts: { target: null }, docs: {} }), false);
  assert.equal(state.validate({ schemaVersion: 1, artifacts: { target: { consumers: 'codex' } }, docs: {} }), false);
  assert.equal(state.validate({ schemaVersion: 1, artifacts: { '../victim': { source: '.easyskillz/skills/demo', consumers: [] } }, docs: {} }), false);
  assert.equal(state.validate({ schemaVersion: 1, artifacts: { target: { source: '../victim', consumers: [] } }, docs: {} }), false);
  assert.equal(state.validate({ schemaVersion: 1, artifacts: {}, docs: { '../AGENTS.md': { source: 'rules.md' } } }), false);
});
