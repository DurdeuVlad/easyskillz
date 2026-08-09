'use strict';

const handlers = {
  skill: () => require('../domains/skill'),
  tool: () => require('../domains/tool'),
  project: () => require('../domains/project'),
  docs: () => require('../domains/docs'),
};

async function dispatch(invocation, context = {}) {
  const handler = handlers[invocation.domain];
  if (!handler) throw Object.assign(new Error(`No handler for ${invocation.domain}`), { code: 'E_USAGE_UNKNOWN_COMMAND', exitCode: 2 });
  const value = await handler()({
    action: invocation.action,
    args: invocation.operands,
    flags: invocation.options,
    cwd: context.cwd || process.cwd(),
    isTTY: Boolean(context.isTTY),
  });
  if (value && value.ok === false && value.error) {
    throw Object.assign(new Error(value.error.message), {
      code: value.error.code,
      details: value.error.details,
      exitCode: value.exitCode,
    });
  }
  if (value && typeof value.ok === 'boolean' && value.command && value.result) return value;
  return { ok: true, command: invocation.command, result: value || {} };
}

module.exports = { dispatch };
