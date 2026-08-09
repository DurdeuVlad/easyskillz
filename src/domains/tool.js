'use strict';

const config = require('../config');
const registry = require('../registry');
const stateStore = require('../state');
const { planTargets } = require('../operations/planner');
const { prepareActions, applyConfigPlan, applyUnregister } = require('../operations/apply');
const project = require('./project');
const { canDelete, inspectCurrent } = require('../outputs/cleanup');

function readConfig(cwd) {
  const result = config.read(cwd);
  if (!result.ok) throw Object.assign(new Error(result.error.message), { code: result.error.code });
  if (result.migrationRequired) throw Object.assign(new Error('config migration is required'), { code: 'W_MIGRATION_REQUIRED' });
  return result.config;
}

function normalizeSurface(name) { return registry.legacyIds[name.toLowerCase()] || name.toLowerCase(); }

async function register({ cwd, name, dryRun }) {
  const id = normalizeSurface(name);
  if (!registry[id]) throw Object.assign(new Error(`unknown tool surface: ${name}`), { code: 'E_CONFIG_VALUE' });
  const current = readConfig(cwd);
  const next = { ...current, tools: [...new Set([...current.tools, id])].sort() };
  const planned = planTargets({ cwd, skills: project.loadSkills(cwd), surfaces: next.tools, materialization: next.materialization });
  const actions = [{ type: 'config-write', path: config.CONFIG_FILE, config: next }, ...prepareActions(cwd, planned)];
  if (dryRun) return { kind: 'preview', applied: false, actions };
  const syncResult = applyConfigPlan({ cwd, nextConfig: next, actions: actions.slice(1) });
  return { applied: true, actions: [actions[0], ...syncResult.actions], issues: syncResult.issues || [] };
}

async function unregister({ cwd, name, dryRun }) {
  const id = normalizeSurface(name);
  if (!registry[id]) throw Object.assign(new Error(`unknown tool surface: ${name}`), { code: 'E_CONFIG_VALUE' });
  const currentConfig = readConfig(cwd);
  const nextConfig = { ...currentConfig, tools: currentConfig.tools.filter((tool) => tool !== id) };
  const stateResult = stateStore.read(cwd);
  if (!stateResult.ok) throw Object.assign(new Error(stateResult.error.message), { code: stateResult.error.code });
  const nextState = structuredClone(stateResult.state);
  const actions = [{ type: 'config-write', path: config.CONFIG_FILE, config: nextConfig }];
  const issues = [];
  for (const [target, manifest] of Object.entries(nextState.artifacts).sort(([a], [b]) => a.localeCompare(b))) {
    if (!manifest.consumers.includes(id)) continue;
    manifest.consumers = manifest.consumers.filter((consumer) => consumer !== id);
    actions.push({ type: 'consumer-remove', target, consumer: id });
    if (manifest.consumers.length) continue;
    const current = inspectCurrent(cwd, target, manifest);
    if (current.kind === 'missing') { delete nextState.artifacts[target]; continue; }
    if (canDelete({ manifest, current })) { actions.push({ type: 'delete-output', target }); delete nextState.artifacts[target]; }
    else issues.push({ code: 'E_OUTPUT_DRIFT', severity: 'error', path: target, message: 'output differs from owned identity and was preserved' });
  }
  if (dryRun) return { kind: 'preview', applied: false, actions, issues };
  applyUnregister({ cwd, nextConfig, nextState, actions });
  return { applied: true, actions, issues };
}

async function tool({ action, args, flags, cwd }) {
  if (action === 'list') { const cfg = readConfig(cwd); return { tools: cfg.tools.map((id) => ({ id, name: registry[id].name, tier: registry[id].tier })) }; }
  if (action === 'register') return register({ cwd, name: args[0], dryRun: Boolean(flags['dry-run']) });
  if (action === 'unregister') return unregister({ cwd, name: args[0], dryRun: Boolean(flags['dry-run']) });
  throw Object.assign(new Error(`unknown tool action: ${action}`), { code: 'E_USAGE_UNKNOWN_COMMAND', exitCode: 2 });
}

module.exports = tool;
