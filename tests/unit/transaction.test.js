'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { runTransaction } = require('../../src/operations/apply');
const { snapshotTree } = require('../support/fs-snapshot');
const { makeFixture, cleanupFixture } = require('../support/fixture');

test('AC-29: shared transaction restores every captured path and removes journal debris', () => {
  const root = makeFixture({ 'one.txt': 'original one\n', 'two.txt': 'original two\n' });
  try {
    const before = snapshotTree(root);
    assert.throws(() => runTransaction({ cwd: root }, (transaction) => {
      transaction.write('one.txt', Buffer.from('replacement one\n'));
      transaction.remove('two.txt');
      transaction.write('created.txt', Buffer.from('created\n'));
      throw new Error('injected failure');
    }), /injected failure/);
    assert.equal(snapshotTree(root), before);
  } finally { cleanupFixture(root); }
});

test('AC-29: shared transaction commits ownership state after filesystem replacements', () => {
  const root = makeFixture({ 'output.txt': 'old\n' });
  const order = [];
  try {
    runTransaction({ cwd: root }, (transaction) => {
      transaction.write('output.txt', Buffer.from('new\n'));
      order.push('output');
      transaction.commitState('.easyskillz/state.json', () => {
        order.push('state');
        fs.mkdirSync(path.join(root, '.easyskillz'), { recursive: true });
        fs.writeFileSync(path.join(root, '.easyskillz/state.json'), '{}\n');
      });
    });
    assert.deepEqual(order, ['output', 'state']);
    assert.equal(fs.readFileSync(path.join(root, 'output.txt'), 'utf8'), 'new\n');
  } finally { cleanupFixture(root); }
});
