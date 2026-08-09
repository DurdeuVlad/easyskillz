'use strict';

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const config = require('../config');
const { parseSkillDocument } = require('../skill-document/parse');
const { validateSkillDocument } = require('../skill-document/validate');
const { createEditPreview, applyEdit } = require('../skill-document/edit');
const { planTargets } = require('../operations/planner');
const { prepareActions, applyPlan, applySkillRemoval, applyActivation } = require('../operations/apply');
const stateStore = require('../state');
const { canDelete, inspectCurrent } = require('../outputs/cleanup');
const { resolveContained } = require('../fs/containment');

function validName(name) { return /^[a-z0-9][a-z0-9-]{0,63}$/.test(name); }
function requireConfig(cwd) { const result = config.read(cwd); if (!result.ok) throw Object.assign(new Error(result.error.message), { code: result.error.code }); return result.config; }
function skillFile(cwd, name) { return resolveContained(cwd, path.posix.join('.easyskillz/skills', name, 'SKILL.md')); }
function template(name) { return `---\nname: ${name}\ndescription: Create and use the ${name} skill\n---\n# ${name}\n\nAdd expert instructions here.\n`; }

function planSkillRemoval(cwd, name, mode) {
  const source = path.posix.join('.easyskillz/skills', name);
  const sourcePath = path.join(cwd, source);
  if (!fs.existsSync(sourcePath)) throw Object.assign(new Error(`skill not found: ${name}`), { code: 'E_SKILL_NAME' });
  const stateResult = stateStore.read(cwd);
  if (!stateResult.ok) throw Object.assign(new Error(stateResult.error.message), { code: stateResult.error.code });
  const nextState = structuredClone(stateResult.state);
  const actions = [{ type: mode === 'deactivate' ? 'deactivate-skill' : 'remove-skill', source, ...(mode === 'deactivate' ? { target: path.posix.join('.easyskillz/skills', `.${name}.disabled`) } : {}) }];
  const issues = [];
  for (const [target, manifest] of Object.entries(nextState.artifacts).sort(([a], [b]) => a.localeCompare(b))) {
    if (manifest.source !== source) continue;
    const cleanupManifest = { ...manifest, consumers: [] };
    const current = inspectCurrent(cwd, target, cleanupManifest);
    if (current.kind === 'missing') { delete nextState.artifacts[target]; continue; }
    if (canDelete({ manifest: cleanupManifest, current })) { actions.push({ type: 'delete-output', target }); delete nextState.artifacts[target]; }
    else { manifest.consumers = []; issues.push({ code: 'E_OUTPUT_DRIFT', severity: 'error', path: target, message: 'output differs from owned identity and was preserved' }); }
  }
  return { actions, issues, nextState };
}

function editContent(document, name, operation) {
  if (operation === 'format' && document.metadata) return `---\n${YAML.stringify(document.metadata).trimEnd()}\n---\n${document.body.replace(/^\r?\n/, '')}`;
  if (document.metadata) {
    const next = { ...document.metadata };
    if (!next.name) next.name = name;
    if (!next.description) next.description = `Create and use the ${name} skill`;
    return `---\n${YAML.stringify(next).trimEnd()}\n---\n${document.body.replace(/^\r?\n/, '')}`;
  }
  return `${template(name).split('---\n#')[0]}---\n${document.source}`;
}

async function skill({ action, args, flags, cwd }) {
  const name = args[0];
  if (['add', 'remove', 'activate', 'deactivate', 'format', 'repair'].includes(action) && !validName(name || '')) throw Object.assign(new Error(`invalid skill name: ${name || ''}`), { code: 'E_SKILL_NAME' });
  if (action === 'list') return { skills: config.listSkills(cwd) };
  if (action === 'validate') {
    const names = name ? [name] : config.listSkills(cwd);
    const issues = [];
    for (const item of names) issues.push(...validateSkillDocument(parseSkillDocument(skillFile(cwd, item)), { expectedName: item }));
    return { valid: !issues.some((issue) => issue.severity === 'error'), issues };
  }
  if (action === 'format' || action === 'repair') {
    const filePath = skillFile(cwd, name);
    const document = parseSkillDocument(filePath);
    const preview = createEditPreview({ filePath, original: document.source, updated: editContent(document, name, action), operation: action });
    const actions = [{ type: `skill-${action}`, path: path.relative(cwd, filePath).replace(/\\/g, '/'), diff: preview.diff }];
    if (!flags.write || flags['dry-run']) return { kind: 'preview', applied: false, actions };
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/T/, '_').replace(/\..+/, '');
    const backupRoot = resolveContained(cwd, path.posix.join('.easyskillz/.backups', stamp, path.dirname(path.relative(cwd, filePath)).replace(/\\/g, '/')));
    return { ...applyEdit(preview, { write: true, backupRoot }), actions };
  }
  if (action === 'add') {
    const cfg = requireConfig(cwd);
    const canonical = path.posix.join('.easyskillz/skills', name, 'SKILL.md');
    const create = { type: 'create-skill', path: canonical, content: template(name) };
    const planned = planTargets({ cwd, skills: [{ name, description: `Create and use the ${name} skill`, body: `# ${name}\n\nAdd expert instructions here.\n`, metadata: {}, resources: [], workflow: false }], surfaces: cfg.tools, materialization: cfg.materialization });
    const actions = [create, ...planned];
    if (flags['dry-run']) return { kind: 'preview', applied: false, actions };
    return applyPlan({ cwd, actions: prepareActions(cwd, actions) });
  }
  if (action === 'deactivate' || action === 'remove') {
    const planned = planSkillRemoval(cwd, name, action);
    if (flags['dry-run']) return { kind: 'preview', applied: false, actions: planned.actions, issues: planned.issues };
    applySkillRemoval({ cwd, planned });
    return { applied: true, actions: planned.actions, issues: planned.issues };
  }
  if (action === 'activate') {
    const disabled = resolveContained(cwd, path.posix.join('.easyskillz/skills', `.${name}.disabled`));
    const active = resolveContained(cwd, path.posix.join('.easyskillz/skills', name));
    if (!fs.existsSync(disabled) || fs.existsSync(active)) throw Object.assign(new Error(`deactivated skill not found: ${name}`), { code: 'E_SKILL_NAME' });
    const activation = { type: 'activate-skill', source: path.relative(cwd, disabled).replace(/\\/g, '/'), target: path.relative(cwd, active).replace(/\\/g, '/') };
    const document = parseSkillDocument(path.join(disabled, 'SKILL.md'));
    const metadata = document.metadata || {};
    const cfg = requireConfig(cwd);
    const plannedTargets = planTargets({
      cwd,
      skills: [{ name, description: metadata.description, body: document.body.replace(/^\r?\n/, ''), metadata, resources: [], workflow: metadata.type === 'workflow' || metadata.workflow === true || metadata.workflow === 'true' }],
      surfaces: cfg.tools,
      materialization: cfg.materialization,
    });
    const actionPlan = [activation, ...plannedTargets];
    if (flags['dry-run']) return { kind: 'preview', applied: false, actions: actionPlan };
    const synced = applyActivation({ cwd, disabled, active, plannedTargets });
    return { applied: true, actions: [activation, ...synced.actions], issues: synced.issues || [] };
  }
  throw Object.assign(new Error(`unknown skill action: ${action}`), { code: 'E_USAGE_UNKNOWN_COMMAND', exitCode: 2 });
}

module.exports = skill;
