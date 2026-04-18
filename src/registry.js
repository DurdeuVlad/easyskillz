'use strict';

// Single source of truth for all supported tools.
// To add a new tool: add one entry here + one file in src/detectors/.
const REGISTRY = {
  claude: {
    id: 'claude',
    name: 'Claude Code',
    skillsDir: '.claude/skills',
    instructionFile: 'CLAUDE.md',
    detectionMarker: '.claude/settings.json', // auto-created by Claude Code on first run
    configFiles: ['.claude/settings.local.json', '.claude/settings.json'],
  },
  codex: {
    id: 'codex',
    name: 'Codex',
    skillsDir: '.codex/skills',
    instructionFile: 'AGENTS.md',
    detectionMarker: '.codex',         // tool-specific dir, not shared AGENTS.md
    configFiles: ['.codex/config.json'],
  },
  cursor: {
    id: 'cursor',
    name: 'Cursor',
    skillsDir: '.cursor/skills',
    instructionFile: 'AGENTS.md',
    detectionMarker: '.cursor',        // tool-specific dir, not shared AGENTS.md
    configFiles: ['.cursor/config.json'],
  },
  windsurf: {
    id: 'windsurf',
    name: 'Windsurf',
    skillsDir: '.windsurf/skills',
    instructionFile: 'AGENTS.md',
    detectionMarker: '.windsurf',       // .windsurf/ folder created by Windsurf IDE on project open
    configFiles: ['.windsurf/settings.json'],
    // Windsurf supports both skills (folder-based) and workflows (flat .md files)
    additionalWiring: [
      {
        skillsDir: '.windsurf/workflows',
        type: 'workflows',  // flat .md files instead of folders
      },
    ],
  },
  'windsurf-workflows': {
    id: 'windsurf-workflows',
    name: 'Windsurf Workflows',
    skillsDir: '.windsurf/workflows',
    instructionFile: 'AGENTS.md',
    detectionMarker: '.windsurf/workflows', // only present when user has workflows
    type: 'workflows',                 // wirer: flat .md files, not skill folders
    configFiles: ['.windsurf/settings.json'],
  },
  copilot: {
    id: 'copilot',
    name: 'GitHub Copilot',
    skillsDir: '.github/skills',
    instructionFile: '.github/copilot-instructions.md',
    detectionMarker: '.github/copilot-instructions.md', // unique to Copilot
    configFiles: [],
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini CLI',
    skillsDir: '.gemini/skills',
    instructionFile: 'GEMINI.md',
    detectionMarker: '.gemini/settings.json', // auto-created by Gemini CLI on first run
    configFiles: ['.gemini/settings.json'],
  },
};

module.exports = REGISTRY;
