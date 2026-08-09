'use strict';

function surface(id, name, skillTargets, instructionFile, detectionMarkers) {
  return { id, name, tier: 'conformant', skillTargets, instructionFile, detectionMarkers, configFiles: [] };
}

const registry = {
  claude: surface('claude', 'Claude Code', [{ kind: 'native', path: '.claude/skills' }], 'CLAUDE.md', ['.claude/settings.json', '.claude']),
  codex: surface('codex', 'Codex', [{ kind: 'native', path: '.agents/skills' }], 'AGENTS.md', ['.codex']),
  copilot: surface('copilot', 'GitHub Copilot', [{ kind: 'native', path: '.agents/skills' }], '.github/copilot-instructions.md', ['.github/copilot-instructions.md']),
  'gemini-cli': surface('gemini-cli', 'Gemini CLI', [{ kind: 'native', path: '.agents/skills' }], 'GEMINI.md', ['.gemini/settings.json', '.gemini']),
  antigravity: surface('antigravity', 'Antigravity', [{ kind: 'native', path: '.agents/skills' }], 'AGENTS.md', ['.agents/skills', 'GEMINI.md']),
  cursor: surface('cursor', 'Cursor', [{ kind: 'native', path: '.agents/skills' }], 'AGENTS.md', ['.cursor']),
  devin: surface('devin', 'Devin', [{ kind: 'native', path: '.agents/skills' }], 'AGENTS.md', ['.devin']),
};

function validateSurface(value) {
  if (!value || !value.id) throw new Error('surface id is required');
  if (value.tier === 'verified') {
    if (!value.activation || !/^\d{4}-\d{2}-\d{2}$/.test(value.activation.date || '') || !value.activation.version) {
      throw new Error('verified surfaces require dated host-version activation evidence');
    }
  }
  return value;
}

for (const value of Object.values(registry)) validateSurface(value);
Object.defineProperty(registry, 'validateSurface', { value: validateSurface, enumerable: false });
Object.defineProperty(registry, 'legacyIds', { value: Object.freeze({ gemini: 'antigravity' }), enumerable: false });
Object.defineProperty(registry, 'legacyOutputs', {
  value: Object.freeze({
    cursor: Object.freeze(['.cursor/rules']),
    gemini: Object.freeze(['.gemini/skills']),
    windsurf: Object.freeze(['.windsurf/skills', '.windsurf/workflows']),
    'devin-desktop': Object.freeze(['.windsurf/skills', '.windsurf/workflows']),
  }),
  enumerable: false,
});

module.exports = Object.freeze(registry);
