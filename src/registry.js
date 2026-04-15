'use strict';

// Single source of truth for all supported tools.
// To add a new tool: add one entry here + one file in src/detectors/.
const REGISTRY = {
  claude: {
    id: 'claude',
    name: 'Claude Code',
    skillsDir: '.claude/skills',
    instructionFile: 'CLAUDE.md',
  },
  codex: {
    id: 'codex',
    name: 'Codex',
    skillsDir: '.codex/skills',
    instructionFile: 'AGENTS.md',
  },
  cursor: {
    id: 'cursor',
    name: 'Cursor',
    skillsDir: '.cursor/skills',
    instructionFile: 'AGENTS.md',
  },
  windsurf: {
    id: 'windsurf',
    name: 'Windsurf',
    skillsDir: '.windsurf/skills',
    instructionFile: 'AGENTS.md',
  },
  'windsurf-workflows': {
    id: 'windsurf-workflows',
    name: 'Windsurf Workflows',
    skillsDir: '.windsurf/workflows',
    instructionFile: 'AGENTS.md',
  },
  copilot: {
    id: 'copilot',
    name: 'GitHub Copilot',
    skillsDir: '.github/skills',
    instructionFile: '.github/copilot-instructions.md',
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini CLI',
    skillsDir: '.gemini/skills',
    instructionFile: 'GEMINI.md',
  },
};

module.exports = REGISTRY;
