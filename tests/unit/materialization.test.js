'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { materializeNative } = require('../../src/outputs/materialize');
const { hashTree } = require('../../src/fs/hash');
const { makeFixture, cleanupFixture } = require('../support/fixture');

test('AC-10: copy materializes the complete skill resource tree without a pointer adapter', () => {
  const root = makeFixture({
    '.easyskillz/skills/demo/SKILL.md': '---\nname: demo\ndescription: Demo\n---\n# Demo\n',
    '.easyskillz/skills/demo/scripts/run.js': 'console.log("ok")\n',
  });
  try {
    const result = materializeNative({ cwd: root, source: '.easyskillz/skills/demo', target: '.claude/skills/demo', requested: 'copy' });
    assert.equal(result.actual, 'copy');
    assert.equal(hashTree(path.join(root, '.easyskillz/skills/demo')), hashTree(path.join(root, '.claude/skills/demo')));
    assert.equal(fs.readFileSync(path.join(root, '.claude/skills/demo/scripts/run.js'), 'utf8'), 'console.log("ok")\n');
  } finally { cleanupFixture(root); }
});

test('AC-13: Claude receives byte-identical skill content and resources', () => {
  const skill = Buffer.from('---\r\nname: demo\r\ndescription: Demo\r\n---\r\n# Demo\r\n');
  const resource = Buffer.from([0, 1, 2, 255]);
  const root = makeFixture();
  try {
    fs.mkdirSync(path.join(root, '.easyskillz/skills/demo/assets'), { recursive: true });
    fs.writeFileSync(path.join(root, '.easyskillz/skills/demo/SKILL.md'), skill);
    fs.writeFileSync(path.join(root, '.easyskillz/skills/demo/assets/data.bin'), resource);
    materializeNative({ cwd: root, source: '.easyskillz/skills/demo', target: '.claude/skills/demo', requested: 'copy' });
    assert.deepEqual(fs.readFileSync(path.join(root, '.claude/skills/demo/SKILL.md')), skill);
    assert.deepEqual(fs.readFileSync(path.join(root, '.claude/skills/demo/assets/data.bin')), resource);
  } finally { cleanupFixture(root); }
});

test('AC-11: auto falls back to a full copy after target-local link failure and is idempotent', () => {
  const root = makeFixture({ '.easyskillz/skills/demo/SKILL.md': '# Demo\n', '.easyskillz/skills/demo/data.txt': 'data' });
  try {
    const first = materializeNative({ cwd: root, source: '.easyskillz/skills/demo', target: '.agents/skills/demo', requested: 'auto', createLink: () => { throw Object.assign(new Error('denied'), { code: 'EPERM' }); } });
    assert.equal(first.actual, 'copy');
    assert.equal(first.issue.code, 'W_LINK_FALLBACK');
    const second = materializeNative({ cwd: root, source: '.easyskillz/skills/demo', target: '.agents/skills/demo', requested: 'auto', createLink: () => { throw Object.assign(new Error('denied'), { code: 'EPERM' }); } });
    assert.equal(second.action, 'none');
  } finally { cleanupFixture(root); }
});

test('native materialization supports explicit links, replacement, and invalid-strategy rejection', () => {
  const root = makeFixture({ '.easyskillz/skills/demo/SKILL.md': '# One\n' });
  try {
    const linked = materializeNative({ cwd: root, source: '.easyskillz/skills/demo', target: '.agents/skills/demo', requested: 'link' });
    assert.equal(linked.actual, 'link');
    assert.equal(materializeNative({ cwd: root, source: '.easyskillz/skills/demo', target: '.agents/skills/demo', requested: 'link' }).action, 'none');
    fs.rmSync(path.join(root, '.agents/skills/demo'), { recursive: true, force: true });
    fs.mkdirSync(path.join(root, '.agents/skills/demo'), { recursive: true });
    fs.writeFileSync(path.join(root, '.agents/skills/demo/old.txt'), 'old');
    const replaced = materializeNative({ cwd: root, source: '.easyskillz/skills/demo', target: '.agents/skills/demo', requested: 'copy' });
    assert.equal(replaced.action, 'write');
    assert.equal(fs.existsSync(path.join(root, '.agents/skills/demo/old.txt')), false);
    assert.throws(() => materializeNative({ cwd: root, source: '.easyskillz/skills/demo', target: '.other/demo', requested: 'invalid' }), /invalid materialization/);
  } finally { cleanupFixture(root); }
});

test('an explicit link failure is surfaced and leaves no staged artifact', () => {
  const root = makeFixture({ '.easyskillz/skills/demo/SKILL.md': '# Demo\n' });
  try {
    assert.throws(() => materializeNative({
      cwd: root,
      source: '.easyskillz/skills/demo',
      target: '.agents/skills/demo',
      requested: 'link',
      createLink: () => { throw Object.assign(new Error('denied'), { code: 'EPERM' }); },
    }), /denied/);
    assert.equal(fs.existsSync(path.join(root, '.agents/skills/demo')), false);
  } finally { cleanupFixture(root); }
});
