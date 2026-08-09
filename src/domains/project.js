'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config');
const { parseSkillDocument } = require('../skill-document/parse');
const { validateSkillDocument } = require('../skill-document/validate');
const { planTargets } = require('../operations/planner');
const { prepareActions, applyPlan } = require('../operations/apply');
const { doctor } = require('../doctor');
const { migrate } = require('../migration');
const { exportProject } = require('../operations/export');

function commandError(issue) {
  const error = new Error(issue.message);
  error.code = issue.code;
  return error;
}

function loadConfig(cwd) {
  const result = config.read(cwd);
  if (!result.ok) throw commandError(result.error);
  if (result.migrationRequired) throw Object.assign(new Error('config schema 1 requires `easyskillz project migrate --write`'), { code: 'W_MIGRATION_REQUIRED' });
  return result.config;
}

function loadSkills(cwd) {
  return config.listSkills(cwd).filter((name) => !name.startsWith('.')).map((name) => {
    const root = path.join(config.skillsPath(cwd), name);
    const file = path.join(root, 'SKILL.md');
    const document = parseSkillDocument(file);
    const issues = validateSkillDocument(document, { expectedName: name });
    const failure = issues.find((issue) => issue.severity === 'error');
    if (failure) throw commandError(failure);
    const resources = [];
    function visit(dir, relative = '') {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const next = path.posix.join(relative, entry.name);
        if (entry.isDirectory()) visit(path.join(dir, entry.name), next);
        else if (next !== 'SKILL.md') resources.push(next);
      }
    }
    visit(root);
    const metadata = document.metadata || {};
    const workflow = metadata.type === 'workflow' || metadata.workflow === true || metadata.workflow === 'true';
    return { name, sourcePath: root, description: metadata.description, body: document.body.replace(/^\r?\n/, ''), metadata, resources, workflow };
  });
}

function syncProject({ cwd, dryRun = false }) {
  const cfg = loadConfig(cwd);
  const planned = planTargets({ cwd, skills: loadSkills(cwd), surfaces: cfg.tools, materialization: cfg.materialization });
  const actions = prepareActions(cwd, planned);
  if (dryRun) return { kind: 'preview', applied: false, actions };
  return applyPlan({ cwd, actions });
}

async function project({ action, flags, cwd }) {
  if (action === 'sync') return syncProject({ cwd, dryRun: Boolean(flags['dry-run']) });
  if (action === 'doctor') return doctor({ cwd, strict: Boolean(flags.strict) });
  if (action === 'migrate') return migrate({ cwd, write: Boolean(flags.write && !flags['dry-run']) });
  if (action === 'export') return exportProject({ cwd, target: flags.target, write: Boolean((flags.confirm || flags.write) && !flags['dry-run']) });
  throw Object.assign(new Error(`unknown project action: ${action}`), { code: 'E_USAGE_UNKNOWN_COMMAND', exitCode: 2 });
}

project.syncProject = syncProject;
project.loadSkills = loadSkills;
module.exports = project;
