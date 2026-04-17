'use strict';

const docsCmd = require('../commands/docs');

async function docs({ action, args, flags, cwd, isTTY }) {
  const { json } = flags;
  
  // Route to existing docs command with subAction
  await docsCmd({ cwd, subAction: action || '', args, json, isTTY });
}

module.exports = docs;
