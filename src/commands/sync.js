'use strict';

const detect  = require('../init/detect');
const { plan } = require('../init/plan');
const execute = require('../init/execute');

async function sync({ cwd, json, isTTY }) {
  const out = json ? () => {} : (s) => process.stdout.write(s + '\n');

  const { toolIds, strategy, existingConfig } = detect(cwd, out);

  if (toolIds.length === 0) {
    out('No AI tools detected in this directory.');
    out('Make sure your tool has a config file here (e.g. CLAUDE.md, AGENTS.md, .cursor/rules).');
    out('Or add a tool manually: easyskillz register <tool>');
    out('Supported tools: claude, codex, cursor, windsurf, copilot, gemini');
    if (json) process.stdout.write(JSON.stringify({ ok: false, tools: [], strategy: null }) + '\n');
    process.exit(1);
    return;
  }

  const actions = await plan(cwd, toolIds, strategy, out, isTTY);

  if (actions === null) {
    out('Aborted.');
    process.exit(0);
  }

  if (actions.length === 0) {
    out('Everything already wired. Nothing to do.');
    if (json) process.stdout.write(JSON.stringify({ ok: true, tools: toolIds, strategy, actions: [] }) + '\n');
    return;
  }

  execute(cwd, toolIds, strategy, actions, out);

  out('');
  out(`Done. ${toolIds.length} tool(s) wired via ${strategy}.`);

  if (json) {
    process.stdout.write(JSON.stringify({ ok: true, tools: toolIds, strategy, actions: actions.map((a) => a.type) }) + '\n');
  }
}

module.exports = sync;
