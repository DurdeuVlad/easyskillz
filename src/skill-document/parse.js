'use strict';

const fs = require('fs');
const YAML = require('yaml');
const { SKILL_DIAGNOSTIC_CODES, createDiagnostic } = require('../diagnostics');

const MAX_ALIAS_COUNT = 20;

function frontmatterBounds(source) {
  const offset = source.startsWith('\uFEFF') ? 1 : 0;
  const content = source.slice(offset);
  const opening = /^(?:---)[ \t]*(?:\r?\n|$)/.exec(content);
  if (!opening) return null;

  const closing = /^(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/gm;
  closing.lastIndex = opening[0].length;
  const match = closing.exec(content);
  if (!match) return null;

  return {
    start: offset,
    contentStart: offset + opening[0].length,
    contentEnd: offset + match.index,
    end: offset + match.index + match[0].length,
  };
}

function looksLikeAdditionalDocument(body) {
  const next = /^(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/.exec(body);
  if (!next) return false;
  const remainder = body.slice(next[0].length);
  return /^(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/m.test(remainder);
}

function hasUnsafeTag(frontmatter) {
  return /(?:^|\r?\n)\s*(?:[^#\r\n]*:\s*)?![^\s]/.test(frontmatter);
}

function parseSkillDocument(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const bounds = frontmatterBounds(source);
  const diagnostics = [];
  const result = {
    path: filePath,
    source,
    hasBom: source.startsWith('\uFEFF'),
    eol: source.includes('\r\n') ? '\r\n' : '\n',
    frontmatter: null,
    body: '',
    metadata: null,
    diagnostics,
  };

  if (!bounds) {
    diagnostics.push(createDiagnostic(SKILL_DIAGNOSTIC_CODES.FRONTMATTER, {
      path: filePath,
      message: 'SKILL.md must start with a delimited YAML frontmatter document.',
    }));
    return result;
  }

  const frontmatter = source.slice(bounds.contentStart, bounds.contentEnd);
  result.frontmatter = { raw: frontmatter, start: bounds.start, end: bounds.end };
  result.body = source.slice(bounds.end);

  if (looksLikeAdditionalDocument(result.body)) {
    diagnostics.push(createDiagnostic(SKILL_DIAGNOSTIC_CODES.FRONTMATTER, {
      path: filePath,
      message: 'SKILL.md frontmatter must contain exactly one YAML document.',
    }));
  }

  if (hasUnsafeTag(frontmatter)) {
    diagnostics.push(createDiagnostic(SKILL_DIAGNOSTIC_CODES.UNSAFE_YAML, {
      path: filePath,
      message: 'Custom YAML tags are not permitted in portable skill frontmatter.',
    }));
  }

  let document;
  try {
    document = YAML.parseDocument(frontmatter, {
      uniqueKeys: true,
      maxAliasCount: MAX_ALIAS_COUNT,
      prettyErrors: false,
      strict: true,
    });
  } catch (error) {
    diagnostics.push(createDiagnostic(SKILL_DIAGNOSTIC_CODES.FRONTMATTER, {
      path: filePath,
      message: `Invalid YAML frontmatter: ${error.message}`,
    }));
    return result;
  }

  if (document.errors.length > 0) {
    diagnostics.push(createDiagnostic(SKILL_DIAGNOSTIC_CODES.FRONTMATTER, {
      path: filePath,
      message: `Invalid YAML frontmatter: ${document.errors[0].message}`,
    }));
  }

  try {
    result.metadata = document.toJS({ maxAliasCount: MAX_ALIAS_COUNT });
  } catch (error) {
    diagnostics.push(createDiagnostic(SKILL_DIAGNOSTIC_CODES.UNSAFE_YAML, {
      path: filePath,
      message: `YAML aliases exceed the safe limit: ${error.message}`,
    }));
  }

  return result;
}

module.exports = { MAX_ALIAS_COUNT, parseSkillDocument };
