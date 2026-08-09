'use strict';

const SKILL_DIAGNOSTIC_CODES = Object.freeze({
  FRONTMATTER: 'E_SKILL_FRONTMATTER',
  NAME: 'E_SKILL_NAME',
  DESCRIPTION: 'E_SKILL_DESCRIPTION',
  TYPE: 'E_SKILL_TYPE',
  UNSAFE_YAML: 'E_SKILL_UNSAFE_YAML',
  EXTENSION: 'W_SKILL_EXTENSION',
});

function createDiagnostic(code, details = {}) {
  return {
    code,
    severity: details.severity || (code.startsWith('W_') ? 'warning' : 'error'),
    path: details.path,
    field: details.field,
    message: details.message || code,
  };
}

function sortDiagnostics(diagnostics) {
  return [...diagnostics].sort((left, right) =>
    String(left.path || '').localeCompare(String(right.path || '')) ||
    String(left.field || '').localeCompare(String(right.field || '')) ||
    left.code.localeCompare(right.code)
  );
}

module.exports = { SKILL_DIAGNOSTIC_CODES, createDiagnostic, sortDiagnostics };
