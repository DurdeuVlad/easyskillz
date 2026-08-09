'use strict';

const { DOMAINS, ALIASES } = require('../cli/schema');

const VERSION = '0.5.1';
const MINIMUM_NODE = 22;

const SURFACES = Object.freeze([
  { id: 'codex', skill: '.agents/skills/<name>/', instructions: 'AGENTS.md', output: 'complete native directory', tier: 'conformant' },
  { id: 'claude', skill: '.claude/skills/<name>/', instructions: 'CLAUDE.md', output: 'complete native directory', tier: 'conformant' },
  { id: 'copilot', skill: '.agents/skills/<name>/', instructions: '.github/copilot-instructions.md', output: 'complete native directory', tier: 'conformant' },
  { id: 'gemini-cli', skill: '.agents/skills/<name>/', instructions: 'GEMINI.md', output: 'complete native directory', tier: 'conformant' },
  { id: 'antigravity', skill: '.agents/skills/<name>/', instructions: 'AGENTS.md / GEMINI.md', output: 'complete native directory', tier: 'conformant' },
  { id: 'cursor', skill: '.agents/skills/<name>/', instructions: 'AGENTS.md', output: 'complete native directory', tier: 'conformant' },
  { id: 'devin', skill: '.agents/skills/<name>/', instructions: 'AGENTS.md', output: 'complete native directory', tier: 'conformant' },
]);

const CANONICAL_COMMANDS = Object.freeze(Object.entries(DOMAINS).flatMap(([domain, value]) =>
  Object.keys(value.actions).map((action) => `${domain}.${action}`)
));

const COMPATIBILITY_ALIASES = Object.freeze(Object.fromEntries(Object.entries(ALIASES).map(([alias, target]) => [
  alias,
  `${target.domain}.${target.action}`,
])));

const EXECUTABLE_EXAMPLES = Object.freeze([
  { label: 'list skills', argv: ['skill', 'list', '--json'], command: 'skill.list' },
  { label: 'validate skills', argv: ['skill', 'validate', '--json'], command: 'skill.validate' },
  { label: 'preview add', argv: ['skill', 'add', 'review-pr', '--dry-run'], command: 'skill.add' },
  { label: 'preview register', argv: ['tool', 'register', 'claude', '--dry-run'], command: 'tool.register' },
  { label: 'doctor', argv: ['project', 'doctor', '--json'], command: 'project.doctor' },
  { label: 'preview sync', argv: ['project', 'sync', '--dry-run', '--json'], command: 'project.sync' },
  { label: 'preview export', argv: ['project', 'export', '--target', 'target', '--dry-run'], command: 'project.export' },
  { label: 'preview migration', argv: ['project', 'migrate', '--dry-run'], command: 'project.migrate' },
  { label: 'preview docs adoption', argv: ['docs', 'adopt', 'docs/AGENTS.source.md', '--target', 'AGENTS.md', '--dry-run'], command: 'docs.adopt' },
  { label: 'preview docs sync', argv: ['docs', 'sync', '--dry-run'], command: 'docs.sync' },
  { label: 'restore help', argv: ['docs', 'restore', '--help'], command: 'docs.restore' },
  { label: 'legacy sync help', argv: ['sync', '--help'], command: 'project.sync' },
  { label: 'legacy doctor help', argv: ['doctor', '--help'], command: 'project.doctor' },
  { label: 'legacy add help', argv: ['add', '--help'], command: 'skill.add' },
]);

function commandLines() {
  return Object.entries(DOMAINS).flatMap(([domain, value]) => [
    `### ${domain}`,
    '',
    ...Object.keys(value.actions).map((action) => `- \`easyskillz ${domain} ${action}\``),
    '',
  ]);
}

function renderReferenceSkill() {
  return [
    '---',
    'name: easyskillz-reference',
    'description: Use when managing project skills, agent targets, migrations, or owned instruction files with Easyskillz 0.5.1.',
    '---',
    '# Easyskillz 0.5.1 reference',
    '',
    'Easyskillz keeps canonical skills in `.easyskillz/skills/<name>/` and materializes complete native directories for configured agent surfaces.',
    '',
    '## Safety contract',
    '',
    '- Preview every mutation with `--dry-run`.',
    '- Apply explicit document, migration, format, and repair operations with `--write`.',
    '- Never edit generated targets; edit the canonical skill directory and sync again.',
    '- Invalid YAML is diagnosed, never silently repaired.',
    '- Cleanup requires local ownership state and an unchanged artifact identity.',
    '- `project sync` does not manage instruction files.',
    '',
    '## Canonical commands',
    '',
    ...commandLines(),
    '## Common workflows',
    '',
    '```bash',
    'easyskillz skill validate',
    'easyskillz skill add review-pr --dry-run',
    'easyskillz project sync --dry-run',
    'easyskillz project doctor --strict',
    'easyskillz project migrate --dry-run',
    'easyskillz docs adopt docs/AGENTS.source.md --target AGENTS.md --dry-run',
    'easyskillz docs sync --dry-run',
    '```',
    '',
    'Human aliases `sync`, `doctor`, and `add <name>` remain deprecated compatibility shims through 0.5.x. Prefer canonical commands.',
    '',
  ].join('\n');
}

function renderInstructionSource() {
  return [
    '<!-- easyskillz-managed -->',
    '## Easyskillz 0.5.1',
    '',
    'Canonical skills live in `.easyskillz/skills/<name>/`. Use the CLI; do not edit generated agent targets.',
    '',
    '```bash',
    'easyskillz skill validate',
    'easyskillz project sync --dry-run',
    'easyskillz project doctor',
    '```',
    '',
    'Mutation is preview-first. Instruction files are managed only through an explicitly adopted source-to-target mapping:',
    '',
    '```bash',
    'easyskillz docs adopt docs/AGENTS.source.md --target AGENTS.md --dry-run',
    'easyskillz docs sync --dry-run',
    '```',
    '',
    'Apply only after reviewing the plan. Easyskillz never treats missing state as deletion authority.',
    '<!-- /easyskillz-managed -->',
    '',
  ].join('\n');
}

module.exports = {
  VERSION,
  MINIMUM_NODE,
  SURFACES,
  CANONICAL_COMMANDS,
  COMPATIBILITY_ALIASES,
  EXECUTABLE_EXAMPLES,
  renderReferenceSkill,
  renderInstructionSource,
};
