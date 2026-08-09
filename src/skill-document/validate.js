'use strict';

const { SKILL_DIAGNOSTIC_CODES, createDiagnostic, sortDiagnostics } = require('../diagnostics');

const MAX_DESCRIPTION_LENGTH = 1024;
const NAME_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const PORTABLE_FIELDS = new Set(['name', 'description', 'license', 'compatibility', 'metadata']);

function validateSkillDocument(document, options = {}) {
  const diagnostics = [...document.diagnostics];
  const metadata = document.metadata;

  if (!metadata || Array.isArray(metadata) || typeof metadata !== 'object') {
    if (!diagnostics.some((diagnostic) => diagnostic.code === SKILL_DIAGNOSTIC_CODES.FRONTMATTER)) {
      diagnostics.push(createDiagnostic(SKILL_DIAGNOSTIC_CODES.FRONTMATTER, {
        path: document.path,
        message: 'SKILL.md frontmatter must be a YAML mapping.',
      }));
    }
    return sortDiagnostics(diagnostics);
  }

  const name = metadata.name;
  if (typeof name !== 'string' || !NAME_PATTERN.test(name)) {
    diagnostics.push(createDiagnostic(SKILL_DIAGNOSTIC_CODES.NAME, {
      path: document.path,
      field: 'name',
      message: 'name must be lowercase kebab-case and no longer than 64 characters.',
    }));
  } else if (options.expectedName && name !== options.expectedName) {
    diagnostics.push(createDiagnostic(SKILL_DIAGNOSTIC_CODES.NAME, {
      path: document.path,
      field: 'name',
      message: `name must match its skill directory (${options.expectedName}).`,
    }));
  }

  const description = metadata.description;
  if (typeof description !== 'string' || !description.trim() || description.length > MAX_DESCRIPTION_LENGTH) {
    diagnostics.push(createDiagnostic(SKILL_DIAGNOSTIC_CODES.DESCRIPTION, {
      path: document.path,
      field: 'description',
      message: `description must be a non-empty string of at most ${MAX_DESCRIPTION_LENGTH} characters.`,
    }));
  }

  if (metadata.license !== undefined && typeof metadata.license !== 'string') {
    diagnostics.push(createDiagnostic(SKILL_DIAGNOSTIC_CODES.TYPE, {
      path: document.path,
      field: 'license',
      message: 'license must be a string when provided.',
    }));
  }
  if (metadata.compatibility !== undefined && typeof metadata.compatibility !== 'string') {
    diagnostics.push(createDiagnostic(SKILL_DIAGNOSTIC_CODES.TYPE, {
      path: document.path,
      field: 'compatibility',
      message: 'compatibility must be a string when provided.',
    }));
  }
  if (metadata.metadata !== undefined && (Array.isArray(metadata.metadata) || !metadata.metadata || typeof metadata.metadata !== 'object')) {
    diagnostics.push(createDiagnostic(SKILL_DIAGNOSTIC_CODES.TYPE, {
      path: document.path,
      field: 'metadata',
      message: 'metadata must be a mapping when provided.',
    }));
  }

  for (const field of Object.keys(metadata)) {
    if (!PORTABLE_FIELDS.has(field)) {
      diagnostics.push(createDiagnostic(SKILL_DIAGNOSTIC_CODES.EXTENSION, {
        path: document.path,
        field,
        message: `Preserved vendor extension field: ${field}.`,
      }));
    }
  }

  return sortDiagnostics(diagnostics);
}

module.exports = { MAX_DESCRIPTION_LENGTH, validateSkillDocument };
