'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { runPty } = require('../tests/support/pty');
const { snapshotTree } = require('../tests/support/cli');

const ROOT = path.resolve(__dirname, '..');
const npmCli = process.env.npm_execpath || path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
const allowedRoots = new Set(['LICENSE', 'README.md', 'package.json', 'index.js']);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: ROOT, encoding: 'utf8', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit ${result.status}\n${result.stdout || ''}${result.stderr || ''}`);
  }
  return result;
}

function runNpm(args, options) {
  const env = { ...process.env, ...(options?.env || {}) };
  for (const key of Object.keys(env)) {
    if (key.toLowerCase().replaceAll('-', '_') === 'npm_config_dry_run') delete env[key];
  }
  const cleanOptions = { ...options, env };
  if (fs.existsSync(npmCli)) return run(process.execPath, [npmCli, ...args], cleanOptions);
  return run(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, { shell: process.platform === 'win32', ...cleanOptions });
}

function assertPackedFiles(files) {
  const unexpected = files
    .map((entry) => entry.path)
    .filter((file) => !allowedRoots.has(file) && !file.startsWith('bin/') && !file.startsWith('src/'));
  if (unexpected.length) throw new Error(`Package contains disallowed files: ${unexpected.join(', ')}`);
}

function runInstalled(binary, args, cwd) {
  const windows = process.platform === 'win32';
  const command = windows ? (process.env.ComSpec || 'cmd.exe') : binary;
  const commandArgs = windows
    ? ['/d', '/s', '/c', `""${binary}" ${args.map((value) => `"${value}"`).join(' ')}"`]
    : args;
  const result = spawnSync(command, commandArgs, {
    cwd,
    encoding: 'utf8',
    windowsVerbatimArguments: windows,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`installed easyskillz ${args.join(' ')} failed with exit ${result.status}\n${result.stdout || ''}${result.stderr || ''}`);
  }
}

async function assertInstalledPty(binary, fixture) {
  const before = snapshotTree(fixture);
  const result = await runPty(['skill', 'add', 'package-pty'], {
    cwd: fixture,
    wrapper: binary,
    respondWhen: 'Apply this plan? [y/N]:',
    response: 'n\r',
    timeoutMs: 10000,
  });
  if (result.status !== 0) throw new Error(`installed PTY command exited ${result.status}\n${result.output}`);
  if ((result.output.match(/Plan for skill\.add:/g) || []).length !== 1) {
    throw new Error(`installed PTY command did not render exactly one plan\n${result.output}`);
  }
  if ((result.output.match(/Apply this plan\?/g) || []).length !== 1) {
    throw new Error(`installed PTY command did not render exactly one prompt\n${result.output}`);
  }
  if (!/Cancelled\./.test(result.output)) throw new Error(`installed PTY rejection was not visible\n${result.output}`);
  if (snapshotTree(fixture) !== before) throw new Error('installed PTY rejection changed the fixture');
  process.stdout.write('Installed PTY confirmation gate passed.\n');
}

function relativeFiles(root, directory = root) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory()
      ? relativeFiles(root, absolute)
      : [path.relative(root, absolute).replaceAll('\\', '/')];
  }).sort();
}

async function assertInstalledPtyAcceptance(binary, fixture) {
  const result = await runPty(['skill', 'add', 'package-pty'], {
    cwd: fixture,
    wrapper: binary,
    respondWhen: 'Apply this plan? [y/N]:',
    response: 'y\r',
    timeoutMs: 10000,
  });
  if (result.status !== 0) throw new Error(`installed PTY acceptance exited ${result.status}\n${result.output}`);
  if ((result.output.match(/Plan for skill\.add:/g) || []).length !== 1) {
    throw new Error(`installed PTY acceptance did not render exactly one plan\n${result.output}`);
  }
  if ((result.output.match(/Apply this plan\?/g) || []).length !== 1) {
    throw new Error(`installed PTY acceptance did not render exactly one prompt\n${result.output}`);
  }
  if (/Cancelled\./.test(result.output)) throw new Error(`installed PTY acceptance was cancelled\n${result.output}`);

  const canonicalRoot = path.join(fixture, '.easyskillz');
  const skill = fs.readFileSync(path.join(canonicalRoot, 'skills', 'package-pty', 'SKILL.md'), 'utf8');
  const state = fs.readFileSync(path.join(canonicalRoot, 'state.json'), 'utf8');
  const expectedSkill = '---\nname: package-pty\ndescription: Create and use the package-pty skill\n---\n# package-pty\n\nAdd expert instructions here.\n';
  const expectedState = `${JSON.stringify({ schemaVersion: 1, artifacts: {}, docs: {} }, null, 2)}\n`;
  if (skill !== expectedSkill) throw new Error('installed PTY acceptance wrote unexpected canonical skill content');
  if (state !== expectedState) throw new Error('installed PTY acceptance wrote unexpected canonical state content');
  const files = relativeFiles(canonicalRoot);
  const expectedFiles = ['skills/package-pty/SKILL.md', 'state.json'];
  if (JSON.stringify(files) !== JSON.stringify(expectedFiles)) {
    throw new Error(`installed PTY acceptance wrote unexpected canonical files: ${files.join(', ')}`);
  }
  process.stdout.write('Installed PTY acceptance gate passed.\n');
}

function installFixture(temporary, artifact, name) {
  const fixture = path.join(temporary, name);
  fs.mkdirSync(fixture);
  fs.writeFileSync(path.join(fixture, 'package.json'), `{"name":"easyskillz-package-${name}","private":true}\n`);
  runNpm(['install', '--ignore-scripts', '--no-audit', '--no-fund', path.join(temporary, artifact.filename)], { cwd: fixture });
  const binary = path.join(fixture, 'node_modules', '.bin', process.platform === 'win32' ? 'easyskillz.cmd' : 'easyskillz');
  const entrypoint = path.join(fixture, 'node_modules', 'easyskillz', 'bin', 'easyskillz.js');
  if (!fs.existsSync(binary) || !fs.existsSync(entrypoint)) throw new Error('installed easyskillz binary is missing');
  return { fixture, binary };
}

async function main() {
  if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('Node.js 22 or newer is required');
  const skipAudit = process.argv.includes('--skip-audit');
  if (!skipAudit) {
    runNpm(['audit', '--json']);
    runNpm(['audit', '--omit=dev', '--json']);
  }

  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'easyskillz-package-'));
  try {
    const packed = runNpm(['pack', '--json', '--pack-destination', temporary]);
    const [artifact] = JSON.parse(packed.stdout);
    if (!artifact || !artifact.filename || !Array.isArray(artifact.files)) throw new Error('npm pack did not return package metadata');
    assertPackedFiles(artifact.files);

    const { fixture, binary } = installFixture(temporary, artifact, 'rejection');
    for (const args of [
      ['--help'],
      ['project', 'doctor', '--json'],
      ['skill', 'add', 'package-smoke', '--dry-run', '--json'],
      ['project', 'sync', '--dry-run', '--json'],
      ['project', 'migrate', '--dry-run', '--json'],
    ]) runInstalled(binary, args, fixture);
    await assertInstalledPty(binary, fixture);

    const acceptance = installFixture(temporary, artifact, 'acceptance');
    await assertInstalledPtyAcceptance(acceptance.binary, acceptance.fixture);

    process.stdout.write('Package gate passed.\n');
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
