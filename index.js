'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { parseInvocation } = require('./src/cli/parse');
const { dispatch } = require('./src/cli/dispatch');
const { renderSuccess, renderError, aliasWarning, promptConfirmation } = require('./src/cli/output');
const { DOMAINS } = require('./src/cli/schema');

function packageVersion() {
  const packagePath = path.join(__dirname, 'package.json');
  return JSON.parse(fs.readFileSync(packagePath, 'utf8')).version;
}

function preview(invocation) {
  return {
    kind: 'preview',
    applied: false,
    actions: [],
    invocation: {
      command: invocation.command,
      operands: invocation.operands,
      options: invocation.options,
    },
  };
}

async function runCli(argv, context = {}) {
  const io = {
    stdin: context.stdin || process.stdin,
    stdout: context.stdout || process.stdout,
    stderr: context.stderr || process.stderr,
  };
  const isTTY = context.isTTY === undefined ? Boolean(io.stdin.isTTY) : context.isTTY;
  const parsed = parseInvocation(argv);
  const optionBoundary = argv.indexOf('--');
  const optionArgs = optionBoundary === -1 ? argv : argv.slice(0, optionBoundary);
  const json = Boolean((parsed.options || parsed.invocation?.options || {}).json || optionArgs.includes('--json'));
  const outputOptions = { json, versionValue: packageVersion() };

  if (!parsed.ok) {
    renderError(parsed, outputOptions, io);
    return 2;
  }
  if (parsed.terminal) {
    renderSuccess(parsed.terminal.command, parsed.terminal.result, outputOptions, io);
    return 0;
  }

  const invocation = parsed.invocation;
  try {
    if (invocation.alias && !json) io.stderr.write(aliasWarning(invocation));
    const explicitlyApplying = Boolean(invocation.options.confirm || invocation.options.write);
    if (invocation.mutating && !explicitlyApplying) {
      const plannedInvocation = { ...invocation, options: { ...invocation.options, 'dry-run': true } };
      const planned = await dispatch(plannedInvocation, { cwd: context.cwd, isTTY });
      renderSuccess(planned.command, planned.result, outputOptions, io, planned.ok);
      const writeGated = DOMAINS[invocation.domain].actions[invocation.action].options.includes('write');
      if (writeGated || invocation.options['dry-run'] || json || !isTTY) return planned.exitCode || (planned.ok ? 0 : 1);
      const confirmed = await promptConfirmation(io);
      if (!confirmed) {
        io.stdout.write('Cancelled.\n');
        return 0;
      }
      invocation.options.confirm = true;
    }

    const outcome = await dispatch(invocation, { cwd: context.cwd, isTTY });
    renderSuccess(outcome.command, outcome.result, outputOptions, io, outcome.ok);
    return outcome.exitCode || (outcome.ok ? 0 : 1);
  } catch (error) {
    const operational = {
      command: invocation.command,
      error: {
        code: error.code || 'E_IO',
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    };
    renderError(operational, outputOptions, io);
    return error.exitCode || (String(error.code || '').startsWith('E_USAGE_') ? 2 : 1);
  }
}

module.exports = {
  runCli,
  parseInvocation,
  dispatch,
};
