'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { runCli, parseSingleJson } = require('../support/cli');
const { snapshotTree } = require('../support/fs-snapshot');
const { makeFixture, cleanupFixture } = require('../support/fixture');
const { applyPlan } = require('../../src/operations/apply');
const { exportProject } = require('../../src/operations/export');
const { failOnCall } = require('../support/failure-injection');

function schema2(tools = ['claude']) {
  return JSON.stringify({ schemaVersion: 2, tools, materialization: 'copy', instructions: { mappings: [] } }, null, 2);
}

test('AC-10/14/20/24: project sync copies full skills, records consumers, leaves docs alone, and reruns as no-op', () => {
  const root = makeFixture({
    '.easyskillz/easyskillz.json': schema2(['codex', 'antigravity']),
    '.easyskillz/skills/demo/SKILL.md': '---\nname: demo\ndescription: Demo skill\n---\n# Demo\n',
    '.easyskillz/skills/demo/scripts/run.js': 'module.exports = true;\n',
    'AGENTS.md': '# User-owned instructions\n',
  });
  try {
    const first = runCli(['project', 'sync', '--confirm', '--json'], { cwd: root });
    assert.equal(first.status, 0, first.stderr || first.stdout);
    const firstEnvelope = parseSingleJson(first.stdout);
    assert.equal(firstEnvelope.result.applied, true);
    assert.equal(firstEnvelope.result.actions.length, 1);
    assert.equal(fs.readFileSync(path.join(root, '.agents/skills/demo/scripts/run.js'), 'utf8'), 'module.exports = true;\n');
    assert.equal(fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), '# User-owned instructions\n');
    const state = JSON.parse(fs.readFileSync(path.join(root, '.easyskillz/state.json'), 'utf8'));
    assert.deepEqual(state.artifacts['.agents/skills/demo'].consumers, ['antigravity', 'codex']);
    const beforeSecond = snapshotTree(root);
    const second = runCli(['project', 'sync', '--confirm', '--json'], { cwd: root });
    assert.equal(second.status, 0, second.stderr || second.stdout);
    assert.deepEqual(parseSingleJson(second.stdout).result.actions, []);
    assert.equal(snapshotTree(root), beforeSecond);
  } finally { cleanupFixture(root); }
});

test('AC-06: sync dry-run returns its real plan and leaves complete fixture unchanged', () => {
  const root = makeFixture({
    '.easyskillz/easyskillz.json': schema2(),
    '.easyskillz/skills/demo/SKILL.md': '---\nname: demo\ndescription: Demo skill\n---\n# Demo\n',
  });
  try {
    const before = snapshotTree(root);
    const dry = runCli(['project', 'sync', '--dry-run', '--json'], { cwd: root });
    assert.equal(dry.status, 0, dry.stderr || dry.stdout);
    const actions = parseSingleJson(dry.stdout).result.actions;
    assert.equal(actions.length, 1);
    assert.equal(actions[0].target, '.claude/skills/demo');
    assert.equal(snapshotTree(root), before);
  } finally { cleanupFixture(root); }
});

test('AC-06: skill add creates valid canonical source and synchronizes registered targets only on apply', () => {
  const root = makeFixture({ '.easyskillz/easyskillz.json': schema2() });
  try {
    const preview = runCli(['skill', 'add', 'review-pr', '--dry-run', '--json'], { cwd: root });
    const previewActions = parseSingleJson(preview.stdout).result.actions;
    assert.equal(previewActions.some((action) => action.type === 'create-skill'), true);
    assert.equal(fs.existsSync(path.join(root, '.easyskillz/skills/review-pr')), false);
    const applied = runCli(['skill', 'add', 'review-pr', '--confirm', '--json'], { cwd: root });
    assert.equal(applied.status, 0, applied.stderr || applied.stdout);
    assert.deepEqual(parseSingleJson(applied.stdout).result.actions, previewActions);
    assert.match(fs.readFileSync(path.join(root, '.easyskillz/skills/review-pr/SKILL.md'), 'utf8'), /description: Create and use the review-pr skill/);
    assert.equal(fs.existsSync(path.join(root, '.claude/skills/review-pr/SKILL.md')), true);
  } finally { cleanupFixture(root); }
});

test('AC-06/14/15: unregister removes only its consumer and deletes only matching zero-consumer output', () => {
  const root = makeFixture({
    '.easyskillz/easyskillz.json': schema2(['codex', 'antigravity']),
    '.easyskillz/skills/demo/SKILL.md': '---\nname: demo\ndescription: Demo skill\n---\n# Demo\n',
  });
  try {
    assert.equal(runCli(['project', 'sync', '--confirm', '--json'], { cwd: root }).status, 0);
    const codexPreview = parseSingleJson(runCli(['tool', 'unregister', 'codex', '--dry-run', '--json'], { cwd: root }).stdout).result.actions;
    const codexApply = runCli(['tool', 'unregister', 'codex', '--confirm', '--json'], { cwd: root });
    assert.equal(codexApply.status, 0);
    assert.deepEqual(parseSingleJson(codexApply.stdout).result.actions, codexPreview);
    let localState = JSON.parse(fs.readFileSync(path.join(root, '.easyskillz/state.json'), 'utf8'));
    assert.deepEqual(localState.artifacts['.agents/skills/demo'].consumers, ['antigravity']);
    assert.equal(fs.existsSync(path.join(root, '.agents/skills/demo')), true);
    assert.equal(runCli(['tool', 'unregister', 'antigravity', '--confirm', '--json'], { cwd: root }).status, 0);
    localState = JSON.parse(fs.readFileSync(path.join(root, '.easyskillz/state.json'), 'utf8'));
    assert.equal(localState.artifacts['.agents/skills/demo'], undefined);
    assert.equal(fs.existsSync(path.join(root, '.agents/skills/demo')), false);
  } finally { cleanupFixture(root); }
});

test('AC-15: unregister preserves drifted output and reports it', () => {
  const root = makeFixture({
    '.easyskillz/easyskillz.json': schema2(['claude']),
    '.easyskillz/skills/demo/SKILL.md': '---\nname: demo\ndescription: Demo skill\n---\n# Demo\n',
  });
  try {
    runCli(['project', 'sync', '--confirm', '--json'], { cwd: root });
    fs.writeFileSync(path.join(root, '.claude/skills/demo/SKILL.md'), '# user drift\n');
    const result = runCli(['tool', 'unregister', 'claude', '--confirm', '--json'], { cwd: root });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(parseSingleJson(result.stdout).result.issues[0].code, 'E_OUTPUT_DRIFT');
    assert.equal(fs.existsSync(path.join(root, '.claude/skills/demo/SKILL.md')), true);
  } finally { cleanupFixture(root); }
});

test('AC-06: tool register updates desired state and synchronizes existing skills', () => {
  const root = makeFixture({
    '.easyskillz/easyskillz.json': schema2([]),
    '.easyskillz/skills/demo/SKILL.md': '---\nname: demo\ndescription: Demo skill\n---\n# Demo\n',
  });
  try {
    const previewActions = parseSingleJson(runCli(['tool', 'register', 'claude', '--dry-run', '--json'], { cwd: root }).stdout).result.actions;
    const result = runCli(['tool', 'register', 'claude', '--confirm', '--json'], { cwd: root });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.deepEqual(parseSingleJson(result.stdout).result.actions, previewActions);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, '.easyskillz/easyskillz.json'), 'utf8')).tools, ['claude']);
    assert.equal(fs.existsSync(path.join(root, '.claude/skills/demo/SKILL.md')), true);
  } finally { cleanupFixture(root); }
});

test('AC-06: skill deactivate and activate safely remove and restore owned outputs', () => {
  const root = makeFixture({
    '.easyskillz/easyskillz.json': schema2(['claude']),
    '.easyskillz/skills/demo/SKILL.md': '---\nname: demo\ndescription: Demo skill\n---\n# Demo\n',
  });
  try {
    runCli(['project', 'sync', '--confirm', '--json'], { cwd: root });
    const deactivatePreview = parseSingleJson(runCli(['skill', 'deactivate', 'demo', '--dry-run', '--json'], { cwd: root }).stdout).result.actions;
    const deactivated = runCli(['skill', 'deactivate', 'demo', '--confirm', '--json'], { cwd: root });
    assert.equal(deactivated.status, 0, deactivated.stderr || deactivated.stdout);
    assert.deepEqual(parseSingleJson(deactivated.stdout).result.actions, deactivatePreview);
    assert.equal(fs.existsSync(path.join(root, '.easyskillz/skills/demo')), false);
    assert.equal(fs.existsSync(path.join(root, '.easyskillz/skills/.demo.disabled/SKILL.md')), true);
    assert.equal(fs.existsSync(path.join(root, '.claude/skills/demo')), false);
    const activatePreview = parseSingleJson(runCli(['skill', 'activate', 'demo', '--dry-run', '--json'], { cwd: root }).stdout).result.actions;
    const activated = runCli(['skill', 'activate', 'demo', '--confirm', '--json'], { cwd: root });
    assert.equal(activated.status, 0, activated.stderr || activated.stdout);
    assert.deepEqual(parseSingleJson(activated.stdout).result.actions, activatePreview);
    assert.equal(fs.existsSync(path.join(root, '.easyskillz/skills/demo/SKILL.md')), true);
    assert.equal(fs.existsSync(path.join(root, '.claude/skills/demo/SKILL.md')), true);
  } finally { cleanupFixture(root); }
});

test('AC-06: skill remove preserves drifted output while deleting canonical source', () => {
  const root = makeFixture({
    '.easyskillz/easyskillz.json': schema2(['claude']),
    '.easyskillz/skills/demo/SKILL.md': '---\nname: demo\ndescription: Demo skill\n---\n# Demo\n',
  });
  try {
    runCli(['project', 'sync', '--confirm', '--json'], { cwd: root });
    fs.writeFileSync(path.join(root, '.claude/skills/demo/SKILL.md'), '# user drift\n');
    const removePreview = parseSingleJson(runCli(['skill', 'remove', 'demo', '--dry-run', '--json'], { cwd: root }).stdout).result.actions;
    const removed = runCli(['skill', 'remove', 'demo', '--confirm', '--json'], { cwd: root });
    assert.equal(removed.status, 0, removed.stderr || removed.stdout);
    assert.equal(parseSingleJson(removed.stdout).result.issues[0].code, 'E_OUTPUT_DRIFT');
    assert.deepEqual(parseSingleJson(removed.stdout).result.actions, removePreview);
    assert.equal(fs.existsSync(path.join(root, '.easyskillz/skills/demo')), false);
    assert.equal(fs.existsSync(path.join(root, '.claude/skills/demo/SKILL.md')), true);
  } finally { cleanupFixture(root); }
});

test('AC-06: project export previews and atomically copies canonical skills/config without destination sync', () => {
  const root = makeFixture({
    '.easyskillz/easyskillz.json': schema2(['claude']),
    '.easyskillz/skills/demo/SKILL.md': '---\nname: demo\ndescription: Demo skill\n---\n# Demo\n',
    'exported/.keep': '',
  });
  const destination = path.join(root, 'exported');
  try {
    const preview = runCli(['project', 'export', '--target', 'exported', '--dry-run', '--json'], { cwd: root });
    assert.equal(preview.status, 0, preview.stderr || preview.stdout);
    const previewActions = parseSingleJson(preview.stdout).result.actions;
    assert.equal(previewActions.length, 2);
    assert.equal(fs.existsSync(path.join(destination, '.easyskillz')), false);
    const applied = runCli(['project', 'export', '--target', 'exported', '--confirm', '--json'], { cwd: root });
    assert.equal(applied.status, 0, applied.stderr || applied.stdout);
    assert.deepEqual(parseSingleJson(applied.stdout).result.actions, previewActions);
    assert.equal(fs.existsSync(path.join(destination, '.easyskillz/skills/demo/SKILL.md')), true);
    assert.equal(fs.existsSync(path.join(destination, '.claude')), false);
    fs.writeFileSync(path.join(root, '.easyskillz/skills/demo/extra.txt'), 'new');
    const replaced = runCli(['project', 'export', '--target', 'exported', '--confirm', '--json'], { cwd: root });
    assert.equal(replaced.status, 0, replaced.stderr || replaced.stdout);
    assert.equal(fs.readFileSync(path.join(destination, '.easyskillz/skills/demo/extra.txt'), 'utf8'), 'new');
    const escaped = runCli(['project', 'export', '--target', '..', '--dry-run', '--json'], { cwd: root });
    assert.equal(escaped.status, 1);
    assert.equal(parseSingleJson(escaped.stdout).error.code, 'E_PATH_ESCAPE');
  } finally { cleanupFixture(root); }
});

test('AC-16: malicious ownership state cannot delete a sibling path', () => {
  const parent = makeFixture();
  const root = path.join(parent, 'project');
  const victim = path.join(parent, 'victim');
  fs.mkdirSync(path.join(root, '.easyskillz'), { recursive: true });
  fs.mkdirSync(victim);
  fs.writeFileSync(path.join(victim, 'keep.txt'), 'keep');
  fs.writeFileSync(path.join(root, '.easyskillz/easyskillz.json'), schema2(['codex']));
  fs.writeFileSync(path.join(root, '.easyskillz/state.json'), JSON.stringify({ schemaVersion: 1, docs: {}, artifacts: { '../victim': { source: '.easyskillz/skills/demo', kind: 'copy', outputHash: 'x', consumers: ['codex'] } } }));
  try {
    const result = runCli(['tool', 'unregister', 'codex', '--confirm', '--json'], { cwd: root });
    assert.equal(result.status, 1);
    assert.equal(parseSingleJson(result.stdout).error.code, 'E_STATE_INVALID');
    assert.equal(fs.readFileSync(path.join(victim, 'keep.txt'), 'utf8'), 'keep');
  } finally { cleanupFixture(parent); }
});

test('AC-16: format and repair reject a canonical-skills parent link escape', () => {
  const parent = makeFixture();
  const root = path.join(parent, 'project');
  const victim = path.join(parent, 'victim');
  fs.mkdirSync(path.join(root, '.easyskillz'), { recursive: true });
  fs.mkdirSync(path.join(victim, 'demo'), { recursive: true });
  const original = '---\nname: demo\ndescription: >\n  Outside\n---\n# Outside\n';
  fs.writeFileSync(path.join(victim, 'demo/SKILL.md'), original);
  fs.symlinkSync(victim, path.join(root, '.easyskillz/skills'), process.platform === 'win32' ? 'junction' : 'dir');
  try {
    for (const operation of ['format', 'repair']) {
      const result = runCli(['skill', operation, 'demo', '--write', '--json'], { cwd: root });
      assert.equal(result.status, 1);
      assert.equal(parseSingleJson(result.stdout).error.code, 'E_PATH_ESCAPE');
    }
    assert.equal(fs.readFileSync(path.join(victim, 'demo/SKILL.md'), 'utf8'), original);
  } finally { cleanupFixture(parent); }
});

test('AC-16: activation rejects a canonical-skills parent link escape', () => {
  const parent = makeFixture();
  const root = path.join(parent, 'project');
  const victim = path.join(parent, 'victim');
  fs.mkdirSync(path.join(root, '.easyskillz'), { recursive: true });
  fs.writeFileSync(path.join(root, '.easyskillz/easyskillz.json'), JSON.stringify(schema2([]), null, 2));
  fs.mkdirSync(path.join(victim, '.demo.disabled'), { recursive: true });
  const original = '---\nname: demo\ndescription: Outside\n---\n# Outside\n';
  fs.writeFileSync(path.join(victim, '.demo.disabled/SKILL.md'), original);
  fs.symlinkSync(victim, path.join(root, '.easyskillz/skills'), process.platform === 'win32' ? 'junction' : 'dir');
  try {
    const result = runCli(['skill', 'activate', 'demo', '--confirm', '--json'], { cwd: root });
    assert.equal(result.status, 1);
    assert.equal(parseSingleJson(result.stdout).error.code, 'E_PATH_ESCAPE');
    assert.equal(fs.existsSync(path.join(victim, '.demo.disabled')), true);
    assert.equal(fs.existsSync(path.join(victim, 'demo')), false);
    assert.equal(fs.readFileSync(path.join(victim, '.demo.disabled/SKILL.md'), 'utf8'), original);
  } finally { cleanupFixture(parent); }
});

test('AC-17: a late multi-output failure rolls back prior outputs and leaves ownership unchanged', () => {
  const root = makeFixture({
    '.easyskillz/skills/one/SKILL.md': '# One\n',
    '.easyskillz/skills/two/SKILL.md': '# Two\n',
  });
  const actions = ['one', 'two'].map((name) => ({
    type: 'materialize', producer: `native:${name}`, kind: 'native', source: `.easyskillz/skills/${name}`,
    target: `.agents/skills/${name}`, requested: 'copy', consumers: ['codex'], skill: { name },
  }));
  try {
    assert.throws(() => applyPlan({ cwd: root, actions, hooks: { beforeAction: (_action, index) => { if (index === 1) throw new Error('injected failure'); } } }), /injected failure/);
    assert.equal(fs.existsSync(path.join(root, '.agents/skills/one')), false);
    assert.equal(fs.existsSync(path.join(root, '.agents/skills/two')), false);
    assert.equal(fs.existsSync(path.join(root, '.easyskillz/state.json')), false);
  } finally { cleanupFixture(root); }
});

test('AC-17: state-commit failure restores a replaced output byte-for-byte', () => {
  const root = makeFixture({
    '.easyskillz/skills/demo/SKILL.md': '# New\n',
    '.agents/skills/demo/SKILL.md': '# Existing\n',
  });
  const action = {
    type: 'materialize', producer: 'native:demo', kind: 'native', source: '.easyskillz/skills/demo',
    target: '.agents/skills/demo', requested: 'copy', consumers: ['codex'], skill: { name: 'demo' },
  };
  try {
    assert.throws(() => applyPlan({ cwd: root, actions: [action], hooks: { beforeStateCommit: () => { throw new Error('state failed'); } } }), /state failed/);
    assert.equal(fs.readFileSync(path.join(root, '.agents/skills/demo/SKILL.md'), 'utf8'), '# Existing\n');
    assert.equal(fs.existsSync(path.join(root, '.easyskillz/state.json')), false);
  } finally { cleanupFixture(root); }
});

test('AC-17/29: failed replacement is byte-atomic, deterministic on retry, and doctor-clean', () => {
  const root = makeFixture({
    '.easyskillz/easyskillz.json': schema2(['codex']),
    '.easyskillz/skills/one/SKILL.md': '---\nname: one\ndescription: One skill\n---\n# New one\n',
    '.easyskillz/skills/two/SKILL.md': '---\nname: two\ndescription: Two skill\n---\n# New two\n',
    '.agents/skills/one/SKILL.md': '# Existing one\n',
  });
  const actions = ['one', 'two'].map((name) => ({
    type: 'materialize', producer: `native:${name}`, kind: 'native', source: `.easyskillz/skills/${name}`,
    target: `.agents/skills/${name}`, requested: 'copy', consumers: ['codex'], skill: { name },
  }));
  try {
    const before = snapshotTree(root);
    assert.throws(() => applyPlan({ cwd: root, actions, hooks: { beforeAction: failOnCall(2) } }), /Injected failure/);
    assert.equal(snapshotTree(root), before);

    const retried = applyPlan({ cwd: root, actions });
    assert.deepEqual(retried.actions, actions);
    const doctor = runCli(['project', 'doctor', '--json'], { cwd: root });
    assert.equal(doctor.status, 0, doctor.stderr || doctor.stdout);
    assert.equal(parseSingleJson(doctor.stdout).result.issueCount, 0);
  } finally { cleanupFixture(root); }
});

test('AC-17: export replacement rolls back byte-for-byte when finalization fails', () => {
  const root = makeFixture({
    '.easyskillz/easyskillz.json': schema2([]),
    '.easyskillz/skills/demo/SKILL.md': '# New\n',
    'exported/.easyskillz/skills/demo/SKILL.md': '# Existing\n',
  });
  try {
    const before = snapshotTree(root);
    assert.throws(() => exportProject({
      cwd: root, target: 'exported', write: true,
      hooks: { beforeCommit: failOnCall(1) },
    }), /Injected failure/);
    assert.equal(snapshotTree(root), before);
  } finally { cleanupFixture(root); }
});

test('AC-06/09: skill list, validate, format, and repair expose explicit read/preview/write contracts', () => {
  const root = makeFixture({
    '.easyskillz/easyskillz.json': schema2([]),
    '.easyskillz/skills/formatted/SKILL.md': '---\nname: formatted\ndescription: >\n  A folded description\n---\n# Formatted\n',
    '.easyskillz/skills/repaired/SKILL.md': '# Repaired\n',
  });
  try {
    const listed = parseSingleJson(runCli(['skill', 'list', '--json'], { cwd: root }).stdout);
    assert.deepEqual(listed.result.skills, ['formatted', 'repaired']);

    const validation = parseSingleJson(runCli(['skill', 'validate', '--json'], { cwd: root }).stdout);
    assert.equal(validation.result.valid, false);
    assert.ok(validation.result.issues.length > 0);

    const beforeFormat = fs.readFileSync(path.join(root, '.easyskillz/skills/formatted/SKILL.md'), 'utf8');
    const formatPreview = parseSingleJson(runCli(['skill', 'format', 'formatted', '--dry-run', '--json'], { cwd: root }).stdout);
    assert.equal(formatPreview.result.kind, 'preview');
    assert.match(formatPreview.result.actions[0].diff, /description/);
    assert.equal(fs.readFileSync(path.join(root, '.easyskillz/skills/formatted/SKILL.md'), 'utf8'), beforeFormat);
    const formatted = runCli(['skill', 'format', 'formatted', '--write', '--json'], { cwd: root });
    assert.equal(formatted.status, 0, formatted.stderr || formatted.stdout);
    assert.deepEqual(parseSingleJson(formatted.stdout).result.actions, formatPreview.result.actions);

    const repairPreview = parseSingleJson(runCli(['skill', 'repair', 'repaired', '--dry-run', '--json'], { cwd: root }).stdout);
    assert.equal(repairPreview.result.kind, 'preview');
    const repaired = runCli(['skill', 'repair', 'repaired', '--write', '--json'], { cwd: root });
    assert.equal(repaired.status, 0, repaired.stderr || repaired.stdout);
    assert.deepEqual(parseSingleJson(repaired.stdout).result.actions, repairPreview.result.actions);
    assert.match(fs.readFileSync(path.join(root, '.easyskillz/skills/repaired/SKILL.md'), 'utf8'), /name: repaired/);
  } finally { cleanupFixture(root); }
});

test('skill operations reject invalid and missing names through the public error contract', () => {
  const root = makeFixture({ '.easyskillz/easyskillz.json': schema2([]) });
  try {
    const invalid = runCli(['skill', 'add', 'Not_Portable', '--confirm', '--json'], { cwd: root });
    assert.equal(invalid.status, 1);
    assert.equal(parseSingleJson(invalid.stdout).error.code, 'E_SKILL_NAME');
    const missing = runCli(['skill', 'remove', 'absent', '--confirm', '--json'], { cwd: root });
    assert.equal(missing.status, 1);
    assert.equal(parseSingleJson(missing.stdout).error.code, 'E_SKILL_NAME');
  } finally { cleanupFixture(root); }
});
