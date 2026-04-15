'use strict';

// Single source of truth for all supported tools.
// To add a new tool: add one entry here + one file in src/detectors/.
const REGISTRY = {
  claude: {
    id: 'claude',
    name: 'Claude Code',
    skillsDir: '.claude/skills',
    instructionFile: 'CLAUDE.md',
    detectionMarker: 'CLAUDE.md',      // unique to Claude Code
  },
  codex: {
    id: 'codex',
    name: 'Codex',
    skillsDir: '.codex/skills',
    instructionFile: 'AGENTS.md',
    detectionMarker: '.codex',         // tool-specific dir, not shared AGENTS.md
  },
  cursor: {
    id: 'cursor',
    name: 'Cursor',
    skillsDir: '.cursor/skills',
    instructionFile: 'AGENTS.md',
    detectionMarker: '.cursor',        // tool-specific dir, not shared AGENTS.md
  },
  windsurf: {
    id: 'windsurf',
    name: 'Windsurf',
    skillsDir: '.windsurf/skills',
    instructionFile: 'AGENTS.md',
    detectionMarker: '.windsurf',      // tool-specific dir, not shared AGENTS.md
  },
  'windsurf-workflows': {
    id: 'windsurf-workflows',
    name: 'Windsurf Workflows',
    skillsDir: '.windsurf/workflows',
    instructionFile: 'AGENTS.md',
    detectionMarker: '.windsurf/workflows', // only present when user has workflows
    type: 'workflows',                 // wirer: flat .md files, not skill folders
  },
  copilot: {
    id: 'copilot',
    name: 'GitHub Copilot',
    skillsDir: '.github/skills',
    instructionFile: '.github/copilot-instructions.md',
    detectionMarker: '.github/copilot-instructions.md', // unique to Copilot
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini CLI',
    skillsDir: '.gemini/skills',
    instructionFile: 'GEMINI.md',
    detectionMarker: 'GEMINI.md',      // unique to Gemini CLI
  },
};

module.exports = REGISTRY;
