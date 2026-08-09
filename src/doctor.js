'use strict';

const fs = require('fs');
const path = require('path');
const config = require('./config');
const stateStore = require('./state');
const { parseSkillDocument } = require('./skill-document/parse');
const { validateSkillDocument } = require('./skill-document/validate');
const { inspectBroadRules } = require('./gitignore');
const { hashFile, hashTree } = require('./fs/hash');
const registry = require('./registry');
const { inspectCurrent } = require('./outputs/cleanup');
const { renderReferenceSkill } = require('./generated/guidance');

const FAMILY = [
  /^E_CONFIG|^W_MIGRATION/, /^E_SKILL|^W_SKILL|^W_TARGET_LOSSY/, /^E_TARGET|^E_OUTPUT|^W_OUTPUT|^W_LINK|^E_STATE/, /^E_DOC|^W_DOC|^W_IGNORE|^W_MANAGED/,
];

function familyIndex(code) {
  const index = FAMILY.findIndex((pattern) => pattern.test(code));
  return index === -1 ? FAMILY.length : index;
}

function sortIssues(issues) {
  return [...issues].sort((a, b) => familyIndex(a.code) - familyIndex(b.code) || String(a.path || '').localeCompare(String(b.path || '')) || a.code.localeCompare(b.code));
}

function configIssues(cwd) {
  const result = config.read(cwd);
  if (!result.ok) return [{ ...result.error, severity: 'error', path: '.easyskillz/easyskillz.json' }];
  return result.migrationRequired ? [{ code: 'W_MIGRATION_REQUIRED', severity: 'warning', path: '.easyskillz/easyskillz.json', message: 'schema 1 config requires explicit migration' }] : [];
}

function skillIssues(cwd) {
  const root = path.join(cwd, '.easyskillz/skills');
  if (!fs.existsSync(root)) return [];
  const issues = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true }).filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = path.join(root, entry.name, 'SKILL.md');
    if (!fs.existsSync(file)) { issues.push({ code: 'E_SKILL_FRONTMATTER', severity: 'error', path: path.relative(cwd, file), message: 'SKILL.md is missing' }); continue; }
    for (const issue of validateSkillDocument(parseSkillDocument(file), { expectedName: entry.name })) issues.push({ ...issue, path: path.relative(cwd, file).replace(/\\/g, '/') });
  }
  return issues;
}

function stateIssues(cwd) {
  const result = stateStore.read(cwd);
  if (!result.ok) return [{ ...result.error, severity: 'error', path: stateStore.STATE_FILE }];
  if (result.kind === 'missing') return [];
  const issues = [];
  for (const [target, artifact] of Object.entries(result.state.artifacts).sort(([a], [b]) => a.localeCompare(b))) {
    const current = inspectCurrent(cwd, target, artifact);
    if (current.kind === 'missing') { issues.push({ code: 'W_OUTPUT_ORPHANED', severity: 'warning', path: target, message: 'owned output is missing' }); continue; }
    try {
      const identityMatches = artifact.kind === 'link'
        ? current.kind === 'link' && artifact.sourceRealpath && path.resolve(current.realpath) === path.resolve(artifact.sourceRealpath)
        : current.kind === artifact.kind && artifact.outputHash && current.outputHash === artifact.outputHash;
      if (!identityMatches) issues.push({ code: 'E_OUTPUT_DRIFT', severity: 'error', path: target, message: 'owned output differs from its recorded identity' });
      const source = path.join(cwd, artifact.source);
      if (fs.existsSync(source) && artifact.sourceHash && hashTree(source) !== artifact.sourceHash) issues.push({ code: 'E_OUTPUT_DRIFT', severity: 'error', path: target, message: 'owned output is stale relative to its canonical source' });
      if (artifact.consumers.length > 1) issues.push({ code: 'W_OUTPUT_SHARED', severity: 'warning', path: target, message: `output is shared by ${artifact.consumers.join(', ')}` });
      const expectedGenerator = artifact.kind === 'copy' || artifact.kind === 'link' ? 'native@1' : `${target.endsWith('.mdc') ? 'cursor-mdc' : 'devin-desktop-workflow'}@1`;
      if (artifact.generator !== expectedGenerator) issues.push({ code: 'W_MANAGED_BLOCK_STALE', severity: 'warning', path: target, message: `output generator ${artifact.generator || 'unknown'} is stale` });
    } catch (cause) { issues.push({ code: 'E_OUTPUT_DRIFT', severity: 'error', path: target, message: cause.message }); }
  }
  issues.push(...unownedOutputIssues(cwd, result.state));
  issues.push(...docsStateIssues(cwd, result.state));
  return issues;
}

function targetName(kind, name) {
  if (kind === 'cursor-mdc') return `${name}.mdc`;
  if (kind === 'devin-desktop-workflow') return `${name}.md`;
  return name;
}

function existsIncludingLink(target) { try { fs.lstatSync(target); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } }

function unownedOutputIssues(cwd, state) {
  const cfg = config.read(cwd);
  if (!cfg.ok || cfg.migrationRequired) return [];
  const names = config.listSkills(cwd).filter((name) => !name.startsWith('.'));
  const targets = new Set();
  for (const surfaceId of cfg.config.tools) {
    const surface = registry[surfaceId];
    if (!surface) continue;
    for (const descriptor of surface.skillTargets) {
      if (descriptor.when === 'workflow') continue;
      for (const name of names) targets.add(path.posix.join(descriptor.path, targetName(descriptor.kind, name)));
    }
  }
  return [...targets].sort().filter((target) => !state.artifacts[target] && existsIncludingLink(path.join(cwd, target))).map((target) => ({
    code: 'W_OUTPUT_UNOWNED', severity: 'warning', path: target, message: 'desired output exists without trusted ownership state',
  }));
}

function docsStateIssues(cwd, state) {
  const issues = [];
  for (const [target, mapping] of Object.entries(state.docs).sort(([a], [b]) => a.localeCompare(b))) {
    const sourcePath = path.join(cwd, mapping.source);
    const targetPath = path.join(cwd, target);
    if (!fs.existsSync(sourcePath) || !fs.existsSync(targetPath)) {
      issues.push({ code: 'W_DOC_UNOWNED', severity: 'warning', path: target, message: 'owned instruction source or target is missing' });
      continue;
    }
    const expected = `<!-- easyskillz-managed source="${mapping.source}" -->`;
    if (!fs.readFileSync(targetPath, 'utf8').includes(expected)) issues.push({ code: 'W_MANAGED_BLOCK_STALE', severity: 'warning', path: target, message: 'managed instruction marker does not match ownership state' });
  }
  return issues;
}

function workspaceIssues(cwd) {
  const issues = [];
  const roots = ['.easyskillz', '.agents', '.claude', '.cursor', '.gemini', '.github', '.devin', '.windsurf'];
  function visit(directory) {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      const relativePath = path.relative(cwd, absolute).replace(/\\/g, '/');
      if (/\.easyskillz-(?:stage|old)-/.test(entry.name)) issues.push({ code: 'E_INTERRUPTED', severity: 'error', path: relativePath, message: 'interrupted staged output requires recovery' });
      if (entry.isDirectory() && !entry.isSymbolicLink() && entry.name !== '.backups') visit(absolute);
    }
  }
  for (const root of roots) visit(path.join(cwd, root));
  const guidance = path.join(cwd, '.easyskillz/skills/easyskillz-reference/SKILL.md');
  if (fs.existsSync(guidance) && fs.readFileSync(guidance, 'utf8') !== renderReferenceSkill()) issues.push({ code: 'W_MANAGED_BLOCK_STALE', severity: 'warning', path: '.easyskillz/skills/easyskillz-reference/SKILL.md', message: 'generated reference guidance is stale' });
  return issues;
}

function doctor({ cwd, strict = false }) {
  const issues = [...configIssues(cwd), ...skillIssues(cwd), ...stateIssues(cwd), ...workspaceIssues(cwd)];
  const ignorePath = path.join(cwd, '.gitignore');
  if (fs.existsSync(ignorePath)) issues.push(...inspectBroadRules(fs.readFileSync(ignorePath, 'utf8')));
  const ordered = sortIssues(issues);
  const hasError = ordered.some((issue) => issue.severity === 'error');
  const ok = !hasError && !(strict && ordered.length > 0);
  const envelope = { ok, command: 'project.doctor', result: { issueCount: ordered.length, issues: ordered } };
  Object.defineProperty(envelope, 'exitCode', { value: ok ? 0 : 1, enumerable: false });
  return envelope;
}

module.exports = { doctor, sortIssues };
