'use strict';

const { afterEach, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { parseSkillDocument } = require('../../src/skill-document/parse');
const { validateSkillDocument } = require('../../src/skill-document/validate');
const { createEditPreview, applyEdit } = require('../../src/skill-document/edit');

const temporaryDirectories = [];

function workspace() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'easyskillz-skill-document-'));
  temporaryDirectories.push(directory);
  return directory;
}

function writeSkill(directory, source) {
  const skillPath = path.join(directory, 'SKILL.md');
  fs.writeFileSync(skillPath, source, 'utf8');
  return skillPath;
}

function codes(diagnostics) {
  return diagnostics.map((diagnostic) => diagnostic.code);
}

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    fs.rmSync(temporaryDirectories.pop(), { recursive: true, force: true });
  }
});

test('AC-07: parses real YAML frontmatter without changing BOM, CRLF, comments, scalar styles, nested values, or extensions', () => {
  const directory = workspace();
  const source = [
    '\uFEFF---',
    '# retained comment',
    'name: api-auditor',
    'description: >-',
    '  Audits APIs with a folded description',
    '  and preserves source bytes.',
    'metadata:',
    '  owners: [platform, security]',
    '  checks:',
    '    timeout: 30',
    'x-vendor:',
    '  literal: |',
    '    Keep this exact line.',
    '---',
    '# Skill body',
  ].join('\r\n') + '\r\n';
  const skillPath = writeSkill(directory, source);

  const document = parseSkillDocument(skillPath);
  const diagnostics = validateSkillDocument(document, { expectedName: 'api-auditor' });

  assert.equal(document.source, source);
  assert.equal(document.hasBom, true);
  assert.equal(document.eol, '\r\n');
  assert.equal(document.metadata.description, 'Audits APIs with a folded description and preserves source bytes.');
  assert.deepEqual(document.metadata.metadata, {
    owners: ['platform', 'security'],
    checks: { timeout: 30 },
  });
  assert.deepEqual(document.metadata['x-vendor'], { literal: 'Keep this exact line.\n' });
  assert.equal(document.body, '# Skill body\r\n');
  assert.deepEqual(codes(diagnostics), ['W_SKILL_EXTENSION']);
  assert.equal(fs.readFileSync(skillPath, 'utf8'), source);
});

test('returns deterministic stable diagnostics for malformed and unsafe YAML', () => {
  const cases = [
    ['malformed', 'name: [unterminated', 'E_SKILL_FRONTMATTER'],
    ['duplicate', 'name: api-auditor\nname: second\ndescription: valid', 'E_SKILL_FRONTMATTER'],
    ['unsafe-tag', 'name: api-auditor\ndescription: !danger value', 'E_SKILL_UNSAFE_YAML'],
    ['many-aliases', [
      'name: api-auditor',
      'description: valid',
      'seed: &seed [one, two, three]',
      ...Array.from({ length: 30 }, (_, index) => `value-${index}: *seed`),
    ].join('\n'), 'E_SKILL_UNSAFE_YAML'],
  ];

  for (const [name, frontmatter, expectedCode] of cases) {
    const directory = workspace();
    const skillPath = writeSkill(directory, `---\n${frontmatter}\n---\nbody\n`);
    const first = validateSkillDocument(parseSkillDocument(skillPath), { expectedName: 'api-auditor' });
    const second = validateSkillDocument(parseSkillDocument(skillPath), { expectedName: 'api-auditor' });

    assert.deepEqual(first, second, `${name} diagnostics must be deterministic`);
    assert.ok(codes(first).includes(expectedCode), `${name} must report ${expectedCode}`);
  }
});

test('rejects multiple documents and invalid portable name and description fields in deterministic field order', () => {
  const directory = workspace();
  const skillPath = writeSkill(directory, [
    '---',
    'name: wrong_name',
    'description: 42',
    '---',
    '---',
    'name: another',
    'description: second document',
    '---',
  ].join('\n'));

  const diagnostics = validateSkillDocument(parseSkillDocument(skillPath), { expectedName: 'api-auditor' });

  assert.deepEqual(codes(diagnostics), [
    'E_SKILL_FRONTMATTER',
    'E_SKILL_DESCRIPTION',
    'E_SKILL_NAME',
  ]);
  assert.equal(diagnostics[1].field, 'description');
  assert.equal(diagnostics[2].field, 'name');
});

test('validates missing and oversized descriptions without rewriting the source', () => {
  const directory = workspace();
  const source = `---\nname: api-auditor\ndescription: ${'x'.repeat(1025)}\n---\n`;
  const skillPath = writeSkill(directory, source);

  const diagnostics = validateSkillDocument(parseSkillDocument(skillPath), { expectedName: 'api-auditor' });

  assert.deepEqual(codes(diagnostics), ['E_SKILL_DESCRIPTION']);
  assert.equal(fs.readFileSync(skillPath, 'utf8'), source);
});

test('AC-09: creates a deterministic edit preview and writes atomically only when explicitly requested, retaining a backup', () => {
  const directory = workspace();
  const skillPath = writeSkill(directory, '---\nname: api-auditor\n---\nBody\n');
  const original = fs.readFileSync(skillPath, 'utf8');
  const updated = '---\nname: api-auditor\ndescription: Audits API endpoints.\n---\nBody\n';
  const preview = createEditPreview({
    filePath: skillPath,
    original,
    updated,
    operation: 'repair',
  });

  assert.equal(preview.changed, true);
  assert.match(preview.diff, /^--- .*SKILL\.md/m);
  assert.equal(fs.readFileSync(skillPath, 'utf8'), original);

  const dryResult = applyEdit(preview, { write: false });
  assert.equal(dryResult.applied, false);
  assert.equal(fs.readFileSync(skillPath, 'utf8'), original);

  const backupRoot = path.join(directory, '.easyskillz', '.backups', 'test');
  const writeResult = applyEdit(preview, { write: true, backupRoot });
  assert.equal(writeResult.applied, true);
  assert.equal(fs.readFileSync(skillPath, 'utf8'), updated);
  assert.equal(fs.readFileSync(writeResult.backupPath, 'utf8'), original);
});

test('portable optional fields report invalid scalar and mapping types', () => {
  const root = workspace();
  const document = parseSkillDocument(writeSkill(root, '---\nname: typed\ndescription: Typed skill\nlicense: 7\ncompatibility:\n  - node\nmetadata:\n  - invalid\n---\n# Typed\n'));
  const issues = validateSkillDocument(document, { expectedName: 'typed' });
  assert.deepEqual(issues.map((issue) => issue.field), ['compatibility', 'license', 'metadata']);
  assert.ok(issues.every((issue) => issue.code === 'E_SKILL_TYPE'));
});
