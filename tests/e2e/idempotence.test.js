'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { runCli, parseSingleJson } = require('../support/cli');
const { snapshotTree } = require('../support/fs-snapshot');
const { makeFixture, cleanupFixture } = require('../support/fixture');

test('AC-24: installed-style public sync is a byte-identical no-op on the second run', () => {
  const root = makeFixture({
    '.easyskillz/easyskillz.json': JSON.stringify({ schemaVersion: 2, tools: ['claude', 'cursor'], materialization: 'copy', instructions: { mappings: [] } }, null, 2),
    '.easyskillz/skills/demo/SKILL.md': '---\nname: demo\ndescription: Demo skill\n---\n# Demo\n',
  });
  try {
    assert.equal(runCli(['project', 'sync', '--confirm', '--json'], { cwd: root }).status, 0);
    const before = snapshotTree(root);
    const second = runCli(['project', 'sync', '--confirm', '--json'], { cwd: root });
    assert.equal(second.status, 0, second.stderr || second.stdout);
    assert.deepEqual(parseSingleJson(second.stdout).result.actions, []);
    assert.equal(snapshotTree(root), before);
    assert.equal(fs.existsSync(path.join(root, '.agents/skills/demo/SKILL.md')), true);
    assert.equal(fs.existsSync(path.join(root, '.cursor/rules/demo.mdc')), false);
  } finally { cleanupFixture(root); }
});
