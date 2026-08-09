'use strict';

const GLOBAL_OPTIONS = {
  help: { type: 'boolean', short: 'h', description: 'Show help' },
  json: { type: 'boolean', description: 'Emit one JSON object' },
};

const OPTIONS = {
  ...GLOBAL_OPTIONS,
  version: { type: 'boolean', description: 'Show version' },
  'dry-run': { type: 'boolean', description: 'Plan without writing' },
  confirm: { type: 'boolean', description: 'Apply without an interactive confirmation' },
  write: { type: 'boolean', description: 'Apply a previewed change' },
  strict: { type: 'boolean', description: 'Treat doctor warnings as failures' },
  target: { type: 'string', description: 'Destination path' },
  mode: { type: 'string', values: ['full', 'revert'], description: 'Unregister mode' },
  docs: { type: 'string', values: ['yes', 'no'], description: 'Legacy docs choice' },
  'docs-strategy': { type: 'string', values: ['unified', 'tool-specific'], description: 'Legacy docs strategy' },
  gitignore: { type: 'string', values: ['full', 'smart', 'minimal', 'conflict-only', 'none'], description: 'Ignore strategy' },
};

function action(usage, operands = [], options = [], mutating = false) {
  return { usage, operands, options: ['help', 'json', ...options], mutating };
}

const DOMAINS = {
  skill: {
    description: 'Manage skills',
    actions: {
      add: action('easyskillz skill add <name> [options]', [{ name: 'name', required: true }], ['dry-run', 'confirm'], true),
      remove: action('easyskillz skill remove <name> [options]', [{ name: 'name', required: true }], ['dry-run', 'confirm'], true),
      activate: action('easyskillz skill activate <name> [options]', [{ name: 'name', required: true }], ['dry-run', 'confirm'], true),
      deactivate: action('easyskillz skill deactivate <name> [options]', [{ name: 'name', required: true }], ['dry-run', 'confirm'], true),
      list: action('easyskillz skill list [options]'),
      validate: action('easyskillz skill validate [name] [options]', [{ name: 'name', required: false }]),
      format: action('easyskillz skill format <name> [options]', [{ name: 'name', required: true }], ['dry-run', 'write'], true),
      repair: action('easyskillz skill repair <name> [options]', [{ name: 'name', required: true }], ['dry-run', 'write'], true),
    },
  },
  tool: {
    description: 'Manage agent surfaces',
    actions: {
      register: action('easyskillz tool register <name> [options]', [{ name: 'name', required: true }], ['dry-run', 'confirm'], true),
      unregister: action('easyskillz tool unregister <name> [options]', [{ name: 'name', required: true }], ['dry-run', 'confirm', 'mode'], true),
      list: action('easyskillz tool list [options]'),
    },
  },
  project: {
    description: 'Project operations',
    actions: {
      sync: action('easyskillz project sync [options]', [], ['dry-run', 'confirm', 'docs', 'docs-strategy', 'gitignore'], true),
      doctor: action('easyskillz project doctor [options]', [], ['strict']),
      export: action('easyskillz project export --target <path> [options]', [], ['dry-run', 'confirm', 'target'], true),
      migrate: action('easyskillz project migrate [options]', [], ['dry-run', 'write'], true),
    },
  },
  docs: {
    description: 'Manage explicit instruction ownership',
    actions: {
      adopt: action('easyskillz docs adopt <source> --target <instruction-path> [options]', [{ name: 'source', required: true }], ['dry-run', 'write', 'target'], true),
      sync: action('easyskillz docs sync [options]', [], ['dry-run', 'write'], true),
      restore: action('easyskillz docs restore <backup-id> --write [options]', [{ name: 'backup-id', required: true }], ['dry-run', 'write'], true),
      list: action('easyskillz docs list [options]'),
    },
  },
};

const ALIASES = {
  sync: { domain: 'project', action: 'sync' },
  doctor: { domain: 'project', action: 'doctor' },
  add: { domain: 'skill', action: 'add' },
};

function optionDisplay(name) {
  const option = OPTIONS[name];
  const value = option.type === 'string' ? ' <value>' : '';
  if (option.short) return `--${name}, -${option.short}${value}`;
  return `--${name}${value}`;
}

function rootHelp() {
  return {
    kind: 'help',
    usage: 'easyskillz <domain> <action> [operands...] [options...]',
    commands: Object.entries(DOMAINS).map(([name, domain]) => `${name} - ${domain.description}`),
    options: ['--help, -h', '--version', '--json'],
  };
}

function domainHelp(domainName) {
  const domain = DOMAINS[domainName];
  return {
    kind: 'help',
    usage: `easyskillz ${domainName} <action> [operands...] [options...]`,
    commands: Object.keys(domain.actions),
    options: ['--help, -h', '--json'],
  };
}

function actionHelp(domainName, actionName) {
  const schema = DOMAINS[domainName].actions[actionName];
  return {
    kind: 'help',
    usage: schema.usage,
    commands: [],
    options: schema.options.map(optionDisplay),
  };
}

module.exports = {
  OPTIONS,
  DOMAINS,
  ALIASES,
  rootHelp,
  domainHelp,
  actionHelp,
};
