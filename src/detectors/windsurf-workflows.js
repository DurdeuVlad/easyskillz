'use strict';

const fs = require('fs');
const path = require('path');
const registry = require('../registry');

module.exports = function detect(cwd) {
  const entry = registry['windsurf-workflows'];
  const found = fs.existsSync(path.join(cwd, entry.skillsDir));
  return { id: entry.id, found, entry };
};
