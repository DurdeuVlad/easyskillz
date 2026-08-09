'use strict';

const SURFACES = new Set(['claude', 'codex', 'copilot', 'gemini-cli', 'antigravity', 'cursor', 'devin']);
const LEGACY_IDS = { gemini: 'antigravity' };
const UNSUPPORTED_LEGACY = Object.freeze({
  windsurf: ['.windsurf/skills', '.windsurf/workflows'],
  'devin-desktop': ['.windsurf/skills', '.windsurf/workflows'],
});
const MATERIALIZATIONS = new Set(['auto', 'link', 'copy']);
const SCHEMA2_KEYS = new Set(['schemaVersion', 'tools', 'materialization', 'instructions']);

function defaultConfig() {
  return { schemaVersion: 2, tools: [], materialization: 'auto', instructions: { mappings: [] } };
}

function error(code, message, details) {
  return { ok: false, error: { code, message, ...(details ? { details } : {}) } };
}

function normalizeTools(tools, legacy = false) {
  if (!Array.isArray(tools) || tools.some((tool) => typeof tool !== 'string')) {
    return error('E_CONFIG_SCHEMA', 'tools must be an array of surface identifiers');
  }
  const normalized = tools.map((id) => legacy ? (LEGACY_IDS[id] || id) : id);
  const unknown = normalized.filter((id) => !SURFACES.has(id));
  if (unknown.length) return error('E_CONFIG_VALUE', `unknown tool surface: ${unknown[0]}`, { value: unknown[0] });
  return { ok: true, tools: [...new Set(normalized)] };
}

function validateSchema2(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return error('E_CONFIG_SCHEMA', 'config must be an object');
  const unknown = Object.keys(value).filter((key) => !SCHEMA2_KEYS.has(key));
  if (unknown.length) return error('E_CONFIG_SCHEMA', `unknown config field: ${unknown[0]}`);
  if (value.schemaVersion !== 2) return error('E_CONFIG_SCHEMA', 'schemaVersion must be 2');
  const toolResult = normalizeTools(value.tools);
  if (!toolResult.ok) return toolResult;
  if (!MATERIALIZATIONS.has(value.materialization)) return error('E_CONFIG_VALUE', `invalid materialization: ${value.materialization}`);
  if (!value.instructions || typeof value.instructions !== 'object' || Array.isArray(value.instructions)) {
    return error('E_CONFIG_SCHEMA', 'instructions must be an object');
  }
  const instructionKeys = Object.keys(value.instructions);
  if (instructionKeys.some((key) => key !== 'mappings') || !Array.isArray(value.instructions.mappings)) {
    return error('E_CONFIG_SCHEMA', 'instructions.mappings must be an array and no unknown instruction fields are allowed');
  }
  return { ok: true, config: { schemaVersion: 2, tools: toolResult.tools, materialization: value.materialization, instructions: { mappings: value.instructions.mappings } } };
}

function normalizeLegacy(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return error('E_CONFIG_SCHEMA', 'legacy config must be an object');
  if (Array.isArray(value.tools)) {
    const unsupported = [...new Set(value.tools.filter((tool) => Object.hasOwn(UNSUPPORTED_LEGACY, tool)))];
    if (unsupported.length) {
      return error('E_CONFIG_LEGACY_SURFACE', `legacy surface requires explicit removal or replacement: ${unsupported[0]}`, {
        surfaces: unsupported,
        outputsPreserved: [...new Set(unsupported.flatMap((tool) => UNSUPPORTED_LEGACY[tool]))],
      });
    }
  }
  const toolResult = normalizeTools(value.tools || [], true);
  if (!toolResult.ok) return toolResult;
  const materialization = value.linkStrategy === 'stub' ? 'copy' : value.linkStrategy === 'symlink' ? 'link' : 'auto';
  return {
    ok: true,
    config: { schemaVersion: 2, tools: toolResult.tools, materialization, instructions: { mappings: [] } },
  };
}

module.exports = { SURFACES, LEGACY_IDS, UNSUPPORTED_LEGACY, defaultConfig, validateSchema2, normalizeLegacy };
