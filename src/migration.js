'use strict';

const fs = require('fs');
const path = require('path');
const config = require('./config');
const stateStore = require('./state');
const { resolveContained } = require('./fs/containment');
const { inspectBroadRules, renderManagedIgnore, replaceManagedBlock } = require('./gitignore');
const { renderReferenceSkill } = require('./generated/guidance');
const { runTransaction } = require('./operations/apply');

const GENERATED = '<!-- easyskillz-generated -->';
const LEGACY_OPEN = '<!-- easyskillz-managed -->';
const LEGACY_CLOSE = '<!-- /easyskillz-managed -->';
const INSTRUCTION_SOURCE = '.easyskillz/docs/INSTRUCTION.md';
const LEGACY_ROOTS = ['.agents/skills', '.claude/skills', '.cursor/rules', '.gemini/skills', '.windsurf/skills', '.windsurf/workflows'];
const INSTRUCTION_TARGETS = ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md'];

function timestampNow() { return new Date().toISOString().replace(/[-:]/g, '').replace(/T/, '_').replace(/\..+/, ''); }
function relative(cwd, absolute) { return path.relative(cwd, absolute).replace(/\\/g, '/'); }

function generatedArtifacts(cwd) {
  const targets = new Set();
  function visit(directory) {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (fs.readFileSync(absolute, 'utf8').includes(GENERATED)) {
        targets.add(entry.name === 'SKILL.md' ? relative(cwd, path.dirname(absolute)) : relative(cwd, absolute));
      }
    }
  }
  for (const root of LEGACY_ROOTS) visit(path.join(cwd, root));
  return [...targets].sort();
}

function replaceLegacyInstruction(content, sourceContent) {
  const start = content.indexOf(LEGACY_OPEN);
  const end = content.indexOf(LEGACY_CLOSE, start + LEGACY_OPEN.length);
  if (start === -1 || end === -1) return content;
  const managed = `<!-- easyskillz-managed source="${INSTRUCTION_SOURCE}" -->\n${sourceContent.replace(/\s*$/, '')}\n${LEGACY_CLOSE}`;
  return `${content.slice(0, start)}${managed}${content.slice(end + LEGACY_CLOSE.length)}`;
}

function inventory(cwd, configResult) {
  const actions = [];
  if (configResult.kind === 'schema1') actions.push({ type: 'config-schema', from: 1, to: 2, path: config.CONFIG_FILE });
  for (const target of generatedArtifacts(cwd)) actions.push({ type: 'legacy-artifact-remove', target });
  for (const target of INSTRUCTION_TARGETS) {
    const absolute = path.join(cwd, target);
    if (fs.existsSync(absolute) && fs.readFileSync(absolute, 'utf8').includes(LEGACY_OPEN)) actions.push({ type: 'instruction-adopt', source: INSTRUCTION_SOURCE, target });
  }
  const guidance = '.easyskillz/skills/easyskillz-reference/SKILL.md';
  const guidancePath = path.join(cwd, guidance);
  if (fs.existsSync(guidancePath) && fs.readFileSync(guidancePath, 'utf8') !== renderReferenceSkill()) actions.push({ type: 'guidance-update', target: guidance });
  const ignorePath = path.join(cwd, '.gitignore');
  const ignoreIssues = fs.existsSync(ignorePath) ? inspectBroadRules(fs.readFileSync(ignorePath, 'utf8')) : [];
  if (ignoreIssues.length) actions.push({ type: 'gitignore-clean', target: '.gitignore', rules: ignoreIssues.map((issue) => issue.details.rule) });
  return { actions, ignoreIssues };
}

function existsIncludingLink(target) { try { fs.lstatSync(target); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } }

function backup(cwd, target, backupRoot, transaction) {
  const source = resolveContained(cwd, target);
  if (!existsIncludingLink(source)) return { target, existed: false };
  const backupTarget = resolveContained(cwd, path.posix.join(backupRoot, target));
  transaction.capture(path.posix.join(backupRoot, target));
  fs.mkdirSync(path.dirname(backupTarget), { recursive: true });
  const stat = fs.lstatSync(source);
  if (stat.isDirectory() && !stat.isSymbolicLink()) fs.cpSync(source, backupTarget, { recursive: true, dereference: false });
  else if (stat.isSymbolicLink()) fs.symlinkSync(fs.readlinkSync(source), backupTarget, process.platform === 'win32' ? 'junction' : undefined);
  else fs.copyFileSync(source, backupTarget);
  return { target, existed: true, backup: relative(cwd, backupTarget) };
}

function migrate({ cwd, write = false, timestamp = timestampNow(), hooks = {} }) {
  const configResult = config.read(cwd);
  if (!configResult.ok) return configResult;
  const stateResult = stateStore.read(cwd);
  if (!stateResult.ok) return stateResult;
  const { actions, ignoreIssues } = inventory(cwd, configResult);
  if (!write) return { ok: true, applied: false, actions, config: configResult.config, issues: ignoreIssues };
  if (!actions.length) return { ok: true, applied: false, actions, config: configResult.config, issues: [] };

  const backupRoot = path.posix.join('.easyskillz/.backups', timestamp);
  const state = structuredClone(stateResult.state);
  try {
    runTransaction({ cwd }, (transaction) => {
      for (const action of actions) {
        const target = action.path || action.target;
        backup(cwd, target, backupRoot, transaction);
        transaction.capture(target);
        if (action.type === 'config-schema') {
          if (hooks.beforeConfigWrite) hooks.beforeConfigWrite({ cwd, config: configResult.config });
          const written = config.write(cwd, configResult.config);
          if (!written.ok) throw Object.assign(new Error(written.error.message), { code: written.error.code });
        } else if (action.type === 'legacy-artifact-remove') {
          transaction.remove(action.target);
        } else if (action.type === 'instruction-adopt') {
          const sourcePath = resolveContained(cwd, action.source);
          if (!fs.existsSync(sourcePath)) throw Object.assign(new Error(`instruction source is missing: ${action.source}`), { code: 'E_MIGRATION_CONFLICT' });
          const targetPath = resolveContained(cwd, action.target);
          const next = replaceLegacyInstruction(fs.readFileSync(targetPath, 'utf8'), fs.readFileSync(sourcePath, 'utf8'));
          transaction.write(action.target, Buffer.from(next));
          state.docs[action.target] = { source: action.source };
        } else if (action.type === 'guidance-update') {
          transaction.write(action.target, Buffer.from(renderReferenceSkill()));
        } else if (action.type === 'gitignore-clean') {
          const current = fs.readFileSync(resolveContained(cwd, action.target), 'utf8');
          transaction.write(action.target, Buffer.from(replaceManagedBlock(current, renderManagedIgnore(Object.keys(state.artifacts)))));
        }
      }
      if (hooks.beforeCommit) hooks.beforeCommit({ cwd, actions });
      if (Object.keys(state.docs).length || stateResult.kind === 'state') transaction.commitState(stateStore.STATE_FILE, () => stateStore.write(cwd, state));
    });
    return { ok: true, applied: true, actions, config: configResult.config, backup: backupRoot, issues: ignoreIssues };
  } catch (cause) {
    return { ok: false, error: { code: 'E_MIGRATION_ROLLBACK', message: 'migration failed and original files were restored', details: { cause: cause.message } } };
  }
}

module.exports = { migrate, generatedArtifacts, replaceLegacyInstruction };
