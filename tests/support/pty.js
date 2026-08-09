'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

const CHILD_SCRIPT = String.raw`
const pty = require('node-pty');
const config = JSON.parse(Buffer.from(process.env.EASYSKILLZ_PTY_CONFIG, 'base64').toString('utf8'));
const child = pty.spawn(config.command, config.commandArgs, {
  cwd: config.cwd,
  env: process.env,
  cols: 100,
  rows: 30,
});
let output = '';
let responded = false;
const timer = setTimeout(() => {
  child.kill();
  process.stderr.write('PTY command timed out.\n');
  process.exit(3);
}, config.timeoutMs);
child.onData((data) => {
  output += data;
  if (!responded && config.respondWhen && output.includes(config.respondWhen)) {
    responded = true;
    child.write(config.response || 'n\r');
  }
});
child.onExit(({ exitCode }) => {
  clearTimeout(timer);
  process.stdout.write(JSON.stringify({ status: exitCode, output }));
  process.exit(0);
});
`;

async function runPty(args, options = {}) {
  if (Boolean(options.entrypoint) === Boolean(options.wrapper)) {
    throw new Error('PTY helper requires exactly one explicit entrypoint or wrapper.');
  }
  const target = path.resolve(options.entrypoint || options.wrapper);
  let command = process.execPath;
  let commandArgs = [target, ...args];
  if (options.wrapper) {
    if (process.platform === 'win32') {
      command = process.env.ComSpec || 'cmd.exe';
      commandArgs = ['/d', '/s', '/c', target, ...args];
    } else {
      command = target;
      commandArgs = args;
    }
  }
  const config = {
    command,
    commandArgs,
    cwd: options.cwd || process.cwd(),
    timeoutMs: options.timeoutMs || 5000,
    respondWhen: options.respondWhen,
    response: options.response,
  };
  const encoded = Buffer.from(JSON.stringify(config)).toString('base64');
  const result = spawnSync(process.execPath, ['-e', CHILD_SCRIPT], {
    cwd: path.resolve(__dirname, '../..'),
    encoding: 'utf8',
    timeout: config.timeoutMs + 3000,
    env: { ...process.env, ...options.env, EASYSKILLZ_PTY_CONFIG: encoded },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error((result.stderr || result.stdout || `PTY helper exited ${result.status}`).trim());
  return JSON.parse(result.stdout);
}

module.exports = { runPty };
