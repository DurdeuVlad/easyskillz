'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { renderManagedIgnore, inspectBroadRules } = require('../../src/gitignore');

test('AC-21: ignore block contains only exact sorted manifested artifacts', () => {
  assert.equal(renderManagedIgnore(['.agents/skills/b', '.agents/skills/a', '.agents/skills/a']), '# easyskillz-start\n/.agents/skills/a\n/.agents/skills/b\n/.easyskillz/state.json\n# easyskillz-end\n');
});

test('AC-21: broad legacy tool and instruction ignores are diagnosed', () => {
  const issues = inspectBroadRules('.agents/\n**/AGENTS.md\n/.claude/skills/demo\n');
  assert.deepEqual(issues.map((issue) => issue.code), ['W_IGNORE_BROAD', 'W_IGNORE_BROAD']);
});
