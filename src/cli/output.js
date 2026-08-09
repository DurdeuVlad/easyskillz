'use strict';

const readline = require('node:readline');

function successEnvelope(command, result) {
  return { ok: true, command, result };
}

function errorEnvelope(command, error) {
  return { ok: false, command: command || null, error };
}

function formatHelp(help) {
  const lines = [`Usage: ${help.usage}`];
  if (help.commands.length) lines.push('', 'Commands:', ...help.commands.map((item) => `  ${item}`));
  if (help.options.length) lines.push('', 'Options:', ...help.options.map((item) => `  ${item}`));
  return `${lines.join('\n')}\n`;
}

function renderSuccess(command, result, options, io, ok = true) {
  if (options.json) {
    io.stdout.write(`${JSON.stringify(ok ? successEnvelope(command, result) : { ok: false, command, result })}\n`);
    return;
  }
  if (result.kind === 'help') {
    io.stdout.write(formatHelp(result));
  } else if (result.kind === 'version') {
    io.stdout.write(`${options.versionValue}\n`);
  } else if (result.kind === 'preview') {
    io.stdout.write(`Plan for ${command}:\n`);
    if (result.actions.length === 0) io.stdout.write('  No actions required.\n');
    io.stdout.write('No changes made.\n');
  } else if (command === 'project.doctor') {
    if (result.issueCount === 0) io.stdout.write('No easyskillz compatibility issues found.\n');
    else {
      io.stdout.write(`Found ${result.issueCount} issue(s):\n`);
      for (const issue of result.issues) io.stdout.write(`  [${issue.code}] ${issue.path || ''} ${issue.message}\n`);
    }
  } else if (Object.keys(result).length) {
    io.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  }
}

function renderError(parsed, options, io) {
  if (options.json) {
    io.stdout.write(`${JSON.stringify(errorEnvelope(parsed.command, parsed.error))}\n`);
  } else {
    io.stderr.write(`Error [${parsed.error.code}]: ${parsed.error.message}\n`);
    const scope = parsed.command ? parsed.command.replace('.', ' ') : '';
    io.stderr.write(`Run 'easyskillz${scope ? ` ${scope}` : ''} --help' for usage.\n`);
  }
}

function aliasWarning(invocation) {
  if (!invocation.alias) return null;
  return `Warning: 'easyskillz ${invocation.alias}' is deprecated; use 'easyskillz ${invocation.domain} ${invocation.action}'. It will be removed no earlier than 0.6.0.\n`;
}

function promptConfirmation(io) {
  const rl = readline.createInterface({ input: io.stdin, output: io.stdout });
  return new Promise((resolve) => {
    rl.question('Apply this plan? [y/N]: ', (answer) => {
      rl.close();
      resolve(/^y(es)?$/i.test(answer.trim()));
    });
  });
}

module.exports = {
  renderSuccess,
  renderError,
  aliasWarning,
  promptConfirmation,
};
