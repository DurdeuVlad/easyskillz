'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const registry = require('../../src/registry');

const DETECTORS = {
  claude: require('../../src/detectors/claude'),
  codex: require('../../src/detectors/codex'),
  copilot: require('../../src/detectors/copilot'),
  cursor: require('../../src/detectors/cursor'),
  devin: require('../../src/detectors/devin'),
  antigravity: require('../../src/detectors/antigravity'),
  'gemini-cli': require('../../src/detectors/gemini-cli'),
};

function workspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'easyskillz-detector-'));
}

function createMarker(cwd, marker) {
  const markerPath = path.join(cwd, marker);
  const isFile = path.extname(marker) !== '';
  fs.mkdirSync(isFile ? path.dirname(markerPath) : markerPath, { recursive: true });
  if (isFile) fs.writeFileSync(markerPath, '', 'utf8');
}

test('AC-27: supported surfaces are explicit and conformant, never implicitly verified', () => {
  assert.deepEqual(Object.keys(registry).sort(), ['antigravity', 'claude', 'codex', 'copilot', 'cursor', 'devin', 'gemini-cli']);
  for (const surface of Object.values(registry)) {
    assert.equal(surface.tier, 'conformant');
    assert.equal(surface.activation, undefined);
    assert.ok(Array.isArray(surface.skillTargets));
  }
});

test('AC-10/12/13/14: retained hosts declare only complete native destinations', () => {
  assert.deepEqual(registry.claude.skillTargets, [{ kind: 'native', path: '.claude/skills' }]);
  for (const id of ['codex', 'copilot', 'gemini-cli', 'antigravity', 'cursor', 'devin']) {
    assert.deepEqual(registry[id].skillTargets, [{ kind: 'native', path: '.agents/skills' }], id);
  }
  assert.equal(fs.existsSync(path.join(__dirname, '../../src/outputs/cursor-mdc.js')), false);
  assert.equal(fs.existsSync(path.join(__dirname, '../../src/outputs/devin-desktop-workflow.js')), false);
  assert.equal(fs.existsSync(path.join(__dirname, '../../src/detectors/devin-desktop.js')), false);
});

test('legacy surface IDs are migration metadata, not active registry entries', () => {
  assert.deepEqual(registry.legacyIds, { gemini: 'antigravity' });
  assert.deepEqual(registry.legacyOutputs, {
    cursor: ['.cursor/rules'],
    gemini: ['.gemini/skills'],
    windsurf: ['.windsurf/skills', '.windsurf/workflows'],
    'devin-desktop': ['.windsurf/skills', '.windsurf/workflows'],
  });
});

test('verified tier requires dated host-version activation evidence', () => {
  assert.throws(() => registry.validateSurface({ id: 'x', tier: 'verified' }), /activation evidence/i);
  assert.doesNotThrow(() => registry.validateSurface({ id: 'x', tier: 'verified', activation: { date: '2026-08-08', version: '1.2.3' } }));
});

test('AC-10/27: every detector returns normalized evidence for each exact declared marker', async (t) => {
  for (const [id, detector] of Object.entries(DETECTORS)) {
    await t.test(id, () => {
      const cwd = workspace();
      try {
        assert.deepEqual(detector(cwd), { found: false, evidence: [] });

        for (const marker of registry[id].detectionMarkers) createMarker(cwd, marker);

        assert.deepEqual(detector(cwd), {
          found: true,
          evidence: registry[id].detectionMarkers,
        });
      } finally {
        fs.rmSync(cwd, { recursive: true, force: true });
      }
    });
  }
});

test('detectors do not infer a surface from unrelated shared instruction files', () => {
  const cwd = workspace();
  try {
    fs.writeFileSync(path.join(cwd, 'AGENTS.md'), '# shared instructions\n', 'utf8');
    assert.deepEqual(DETECTORS.codex(cwd), { found: false, evidence: [] });
    assert.deepEqual(DETECTORS.cursor(cwd), { found: false, evidence: [] });
    assert.deepEqual(DETECTORS.devin(cwd), { found: false, evidence: [] });
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});
