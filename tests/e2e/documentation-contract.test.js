'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseInvocation } = require('../../src/cli/parse');
const {
  VERSION,
  MINIMUM_NODE,
  SURFACES,
  CANONICAL_COMMANDS,
  COMPATIBILITY_ALIASES,
  EXECUTABLE_EXAMPLES,
  renderReferenceSkill,
  renderInstructionSource,
} = require('../../src/generated/guidance');
const { makeWorkspace, removeWorkspace, runCli } = require('../support/cli');

const ROOT = path.resolve(__dirname, '../..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('AC-23: generated reference skill and instruction source are byte-stable', () => {
  assert.equal(read('.easyskillz/skills/easyskillz-reference/SKILL.md'), renderReferenceSkill());
  assert.equal(read('.easyskillz/docs/INSTRUCTION.md'), renderInstructionSource());
  assert.equal(renderReferenceSkill(), renderReferenceSkill());
  assert.equal(renderInstructionSource(), renderInstructionSource());
});

test('generated commands match the public schema and every example parses', () => {
  assert.deepEqual(CANONICAL_COMMANDS, [
    'skill.add', 'skill.remove', 'skill.activate', 'skill.deactivate', 'skill.list',
    'skill.validate', 'skill.format', 'skill.repair',
    'tool.register', 'tool.unregister', 'tool.list',
    'project.sync', 'project.doctor', 'project.export', 'project.migrate',
    'docs.adopt', 'docs.sync', 'docs.restore', 'docs.list',
  ]);
  assert.deepEqual(Object.keys(COMPATIBILITY_ALIASES), ['sync', 'doctor', 'add']);

  for (const example of EXECUTABLE_EXAMPLES) {
    const parsed = parseInvocation(example.argv);
    assert.equal(parsed.ok, true, `${example.label}: ${example.argv.join(' ')}`);
    assert.equal(parsed.invocation?.command || parsed.terminal?.command, example.command, example.label);
  }
});

test('every generated example executes against the public binary', () => {
  const cwd = makeWorkspace();
  try {
    fs.mkdirSync(path.join(cwd, 'target'));
    fs.mkdirSync(path.join(cwd, 'docs'));
    fs.writeFileSync(path.join(cwd, 'docs/AGENTS.source.md'), '# Project instructions\n', 'utf8');

    for (const example of EXECUTABLE_EXAMPLES) {
      const result = runCli(example.argv, { cwd });
      assert.equal(result.status, 0, `${example.label}: ${result.stderr || result.stdout}`);
    }
  } finally {
    removeWorkspace(cwd);
  }
});

test('AC-28: release documentation states the stable runtime and compatibility policy', () => {
  assert.equal(VERSION, '0.5.0');
  assert.equal(MINIMUM_NODE, 22);

  const readme = read('README.md');
  const changelog = read('CHANGELOG.md');
  const development = read('DEVELOPMENT.md');
  const contributing = read('CONTRIBUTING.md');
  const install = read('INSTALL-SKILL.md');

  for (const [name, content] of Object.entries({ readme, changelog, development, contributing, install })) {
    assert.match(content, /0\.5\.0/, name);
    assert.match(content, /Node(?:\.js)? 22\+/, name);
  }
  assert.match(readme, /CLI-only public API/i);
  assert.match(readme, /through 0\.5\.x/);
  assert.match(readme, /no earlier than 0\.6\.0/);
  assert.match(changelog, /2\.0\.0-alpha\.3.*historical/i);
  assert.doesNotMatch(readme, /auto-repair/i);
  assert.doesNotMatch(readme, /pointer adapter/i);
  assert.doesNotMatch(readme, /automatically centraliz/i);
});

test('documented surface matrix is complete and does not overclaim verification', () => {
  const readme = read('README.md');
  const research = read('docs/research/agent-compatibility-gap.md');
  assert.deepEqual(SURFACES.map((surface) => surface.id), [
    'codex', 'claude', 'copilot', 'gemini-cli', 'antigravity', 'cursor', 'devin',
  ]);
  for (const surface of SURFACES) {
    assert.ok(readme.includes(`| \`${surface.id}\` |`), surface.id);
    assert.ok(research.includes(`| \`${surface.id}\` |`), surface.id);
    assert.equal(surface.tier, 'conformant');
  }
  assert.match(readme, /complete native director/i);
  assert.match(readme, /share.*\.agents\/skills/is);
  assert.doesNotMatch(readme, /devin-desktop|\.cursor\/rules|\.windsurf\//i);
  assert.doesNotMatch(research, /devin-desktop.*conformant|versioned MDC transform/i);
  assert.match(readme, /explicit docs ownership/i);
  assert.match(research, /verified.*dated activation.*host version/is);
});

test('architecture and wiki docs describe plan/apply/state rather than legacy wiring', () => {
  const files = [
    'docs/COMMAND_DESIGN.md',
    'docs/OOP_ARCHITECTURE.md',
    'docs/wiki/Home.md',
    'docs/wiki/How-to-Contribute.md',
    'docs/wiki/Understanding-the-Codebase.md',
  ];
  for (const file of files) {
    const content = read(file);
    assert.match(content, /0\.5\.0/, file);
    assert.doesNotMatch(content, /\.codex\/skills/, file);
    assert.doesNotMatch(content, /pointer-only/i, file);
  }
  assert.match(read('docs/OOP_ARCHITECTURE.md'), /validate.*plan.*apply.*state/is);
});
