'use strict';

// Single source of truth for all supported tools.
// To add a new tool: add one entry here + one file in src/detectors/.
const REGISTRY = {
  claude: {
    id: 'claude',
    name: 'Claude Code',
    toolDir: '.claude',
    skillTargets: [{ kind: 'skill-dir', path: '.claude/skills' }],
    skillsDir: '.claude/skills',
    instructionFile: 'CLAUDE.md',
    detectionMarkers: ['.claude/settings.json', '.claude', 'CLAUDE.md'], // auto-created, folder or instruction file
    configFiles: ['.claude/settings.local.json', '.claude/settings.json'],
  },
  codex: {
    id: 'codex',
    name: 'Codex',
    toolDir: '.codex',
    skillTargets: [{ kind: 'skill-dir', path: '.agents/skills' }],
    skillsDir: '.agents/skills',
    instructionFile: 'AGENTS.md',
    detectionMarkers: ['.codex'],         // tool-specific dir
    configFiles: ['.codex/config.json'],
  },
  cursor: {
    id: 'cursor',
    name: 'Cursor',
    toolDir: '.cursor',
    skillTargets: [{ kind: 'cursor-rule', path: '.cursor/rules' }],
    skillsDir: '.cursor/rules',
    instructionFile: 'AGENTS.md',
    detectionMarkers: ['.cursor'],        // tool-specific dir
    configFiles: ['.cursor/config.json'],
  },
  windsurf: {
    id: 'windsurf',
    name: 'Windsurf',
    toolDir: '.windsurf',
    skillTargets: [
      { kind: 'skill-dir', path: '.windsurf/skills' },
      { kind: 'windsurf-workflow', path: '.windsurf/workflows' },
    ],
    skillsDir: '.windsurf/skills',
    instructionFile: 'AGENTS.md',
    detectionMarkers: ['.windsurf', '.windsurf/workflows'], // folder or workflows root
    configFiles: ['.windsurf/settings.json'],
  },
  copilot: {
    id: 'copilot',
    name: 'GitHub Copilot',
    toolDir: '.github',
    skillTargets: [{ kind: 'skill-dir', path: '.github/skills' }],
    skillsDir: '.github/skills',
    instructionFile: '.github/copilot-instructions.md',
    detectionMarkers: ['.github/copilot-instructions.md', '.github/skills'], // unique files only, not root .github
    configFiles: [],
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini CLI',
    toolDir: '.gemini',
    skillTargets: [{ kind: 'skill-dir', path: '.gemini/skills' }],
    skillsDir: '.gemini/skills',
    instructionFile: 'GEMINI.md',
    detectionMarkers: ['.gemini/settings.json', '.gemini', 'GEMINI.md'], // folder or instruction file
    configFiles: ['.gemini/settings.json'],
  },
};

module.exports = REGISTRY;
