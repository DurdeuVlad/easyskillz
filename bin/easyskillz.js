#!/usr/bin/env node
'use strict';

const { runCli } = require('../index');

runCli(process.argv.slice(2)).then(
  (exitCode) => { process.exitCode = exitCode; },
  (error) => {
    process.stderr.write(`Error [E_IO]: ${error.message}\n`);
    if (process.env.DEBUG) process.stderr.write(`${error.stack}\n`);
    process.exitCode = 1;
  },
);
