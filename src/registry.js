'use strict';

// Single source of truth for all supported tools.
// To add a new tool: add one entry here + one file in src/detectors/.
const REGISTRY = {
  claude: {
    id: 'claude',
    name: 'Claude Code',
    skillsDir: '.claude/skills',
    instructionFile: 'CLAUDE.md',
    detectionMarkers: ['.claude/settings.json', '.claude', 'CLAUDE.md'], // auto-created, folder or instruction file
    configFiles: ['.claude/settings.local.json', '.claude/settings.json'],
  },
  codex: {
    id: 'codex',
    name: 'Codex',
    skillsDir: '.codex/skills',
    instructionFile: 'AGENTS.md',
    detectionMarkers: ['.codex'],         // tool-specific dir
    configFiles: ['.codex/config.json'],
  },
  cursor: {
    id: 'cursor',
    name: 'Cursor',
    skillsDir: '.cursor/skills',
    instructionFile: 'AGENTS.md',
    detectionMarkers: ['.cursor'],        // tool-specific dir
    configFiles: ['.cursor/config.json'],
  },
  windsurf: {
    id: 'windsurf',
    name: 'Windsurf',
    skillsDir: '.windsurf/skills',
    instructionFile: 'AGENTS.md',
    detectionMarkers: ['.windsurf'],       // folder created on project open
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
    detectionMarkers: ['.windsurf/workflows', '.windsurf'], // workflows dir or root folder
    type: 'workflows',                 // wirer: flat .md files, not skill folders
    configFiles: ['.windsurf/settings.json'],
  },
  copilot: {
    id: 'copilot',
    name: 'GitHub Copilot',
    skillsDir: '.github/skills',
    instructionFile: '.github/copilot-instructions.md',
    detectionMarkers: ['.github/copilot-instructions.md', '.github/skills'], // unique files only, not root .github
    configFiles: [],
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini CLI',
    skillsDir: '.gemini/skills',
    instructionFile: 'GEMINI.md',
    detectionMarkers: ['.gemini/settings.json', '.gemini', 'GEMINI.md'], // folder or instruction file
    configFiles: ['.gemini/settings.json'],
  },
};

module.exports = REGISTRY;
