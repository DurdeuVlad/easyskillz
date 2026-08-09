'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { resolveContained } = require('../../src/fs/containment');
const { hashFile, hashTree } = require('../../src/fs/hash');
const { writeFileAtomic } = require('../../src/fs/atomic');
const { makeFixture, cleanupFixture } = require('../support/fixture');
const { failOnCall } = require('../support/failure-injection');

test('AC-16: relative contained paths resolve inside workspace', () => {
  const root = makeFixture();
  try { assert.equal(resolveContained(root, 'inside/file.txt'), path.join(root, 'inside', 'file.txt')); }
  finally { cleanupFixture(root); }
});

test('AC-16: absolute and parent traversal paths fail with E_PATH_ESCAPE', () => {
  const root = makeFixture();
  try {
    for (const target of [path.join(root, 'absolute.txt'), '../outside.txt']) {
      assert.throws(() => resolveContained(root, target), (error) => error.code === 'E_PATH_ESCAPE');
    }
  } finally { cleanupFixture(root); }
});

test('AC-16: existing parent link escape is rejected', (t) => {
  const root = makeFixture();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'easyskillz-outside-'));
  try {
    const link = path.join(root, 'linked');
    try { fs.symlinkSync(outside, link, process.platform === 'win32' ? 'junction' : 'dir'); }
    catch (error) { t.skip(`link unavailable: ${error.code}`); return; }
    assert.throws(() => resolveContained(root, 'linked/file.txt'), (error) => error.code === 'E_PATH_ESCAPE');
  } finally { cleanupFixture(root); fs.rmSync(outside, { recursive: true, force: true }); }
});

test('hashTree is deterministic and includes resource bytes and paths', () => {
  const a = makeFixture({ 'a.txt': 'one', 'nested/b.txt': 'two' });
  const b = makeFixture({ 'nested/b.txt': 'two', 'a.txt': 'one' });
  try {
    assert.equal(hashFile(path.join(a, 'a.txt')), hashFile(path.join(b, 'a.txt')));
    assert.equal(hashTree(a), hashTree(b));
    fs.writeFileSync(path.join(b, 'nested/b.txt'), 'changed');
    assert.notEqual(hashTree(a), hashTree(b));
  } finally { cleanupFixture(a); cleanupFixture(b); }
});

test('AC-17: atomic file replacement exposes complete new content and removes stages', () => {
  const root = makeFixture({ 'value.txt': 'old' });
  try {
    writeFileAtomic(root, 'value.txt', Buffer.from('new'));
    assert.equal(fs.readFileSync(path.join(root, 'value.txt'), 'utf8'), 'new');
    assert.deepEqual(fs.readdirSync(root).sort(), ['value.txt']);
  } finally { cleanupFixture(root); }
});

test('AC-17: injected pre-rename failure preserves prior file and removes staged content', () => {
  const root = makeFixture({ 'value.txt': 'old' });
  try {
    assert.throws(() => writeFileAtomic(root, 'value.txt', Buffer.from('new'), { beforeRename: failOnCall(1) }), /Injected failure/);
    assert.equal(fs.readFileSync(path.join(root, 'value.txt'), 'utf8'), 'old');
    assert.deepEqual(fs.readdirSync(root).sort(), ['value.txt']);
  } finally { cleanupFixture(root); }
});
