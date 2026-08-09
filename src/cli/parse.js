'use strict';

const { parseArgs } = require('node:util');
const { OPTIONS, DOMAINS, ALIASES, rootHelp, domainHelp, actionHelp } = require('./schema');

function failure(code, message, command = null, details) {
  return { ok: false, command, error: { code, message, ...(details ? { details } : {}) } };
}

function parseError(error) {
  const message = String(error.message || error);
  if (message.includes('does not take an argument')) {
    return failure('E_USAGE_INVALID_VALUE', message);
  }
  if (message.includes('argument missing') || message.includes('must be followed by')) {
    return failure('E_USAGE_MISSING_VALUE', message);
  }
  return failure('E_USAGE_UNKNOWN_OPTION', message);
}

function parseInvocation(argv) {
  let parsed;
  try {
    const optionConfig = Object.fromEntries(Object.entries(OPTIONS).map(([name, option]) => [
      name,
      { type: option.type, ...(option.short ? { short: option.short } : {}) },
    ]));
    parsed = parseArgs({ args: argv, options: optionConfig, allowPositionals: true, strict: true, tokens: true });
  } catch (error) {
    return parseError(error);
  }

  const seen = new Set();
  for (const token of parsed.tokens) {
    if (token.kind !== 'option') continue;
    if (seen.has(token.name)) {
      return failure('E_USAGE_DUPLICATE_OPTION', `Option --${token.name} may only be provided once.`);
    }
    seen.add(token.name);
  }

  const positionals = [...parsed.positionals];
  const first = positionals.shift();
  const values = { ...parsed.values };

  if (!first) {
    if (values.version) return { ok: true, terminal: { command: 'root', result: { kind: 'version' } }, options: values };
    if (values.help) return { ok: true, terminal: { command: 'root', result: rootHelp() }, options: values };
    return { ok: true, terminal: { command: 'root', result: rootHelp() }, options: values };
  }

  let domainName = first;
  let actionName;
  let alias = null;

  if (ALIASES[first]) {
    alias = first;
    domainName = ALIASES[first].domain;
    actionName = ALIASES[first].action;
  } else if (DOMAINS[first]) {
    actionName = positionals.shift();
  } else {
    return failure('E_USAGE_UNKNOWN_COMMAND', `Unknown command "${first}".`);
  }

  if (!actionName) {
    if (values.help) return { ok: true, terminal: { command: domainName, result: domainHelp(domainName) }, options: values };
    return failure('E_USAGE_UNKNOWN_COMMAND', `Missing action for domain "${domainName}".`, domainName);
  }

  const actionSchema = DOMAINS[domainName].actions[actionName];
  const command = `${domainName}.${actionName}`;
  if (!actionSchema) return failure('E_USAGE_UNKNOWN_COMMAND', `Unknown action "${actionName}" for domain "${domainName}".`, domainName);

  const allowed = new Set(actionSchema.options);
  for (const name of Object.keys(values)) {
    if (!allowed.has(name)) {
      return failure('E_USAGE_UNKNOWN_OPTION', `Option --${name} is not valid for ${command}.`, command);
    }
    const definition = OPTIONS[name];
    if (definition.values && !definition.values.includes(values[name])) {
      return failure('E_USAGE_INVALID_VALUE', `Invalid value "${values[name]}" for --${name}.`, command, { allowed: definition.values });
    }
  }

  if (values.help) {
    return { ok: true, terminal: { command, result: actionHelp(domainName, actionName) }, options: values };
  }

  const minOperands = actionSchema.operands.filter((operand) => operand.required).length;
  const maxOperands = actionSchema.operands.length;
  if (positionals.length < minOperands) {
    return failure('E_USAGE_MISSING_VALUE', `Missing required operand <${actionSchema.operands[positionals.length].name}>.`, command);
  }
  if (positionals.length > maxOperands) {
    return failure('E_USAGE_EXTRA_OPERAND', `Unexpected operand "${positionals[maxOperands]}".`, command);
  }
  if ((command === 'project.export' || command === 'docs.adopt') && !values.target) {
    return failure('E_USAGE_MISSING_VALUE', 'Missing required option --target.', command);
  }

  return {
    ok: true,
    invocation: {
      command,
      domain: domainName,
      action: actionName,
      operands: positionals,
      options: values,
      alias,
      mutating: actionSchema.mutating,
    },
  };
}

module.exports = { parseInvocation };
