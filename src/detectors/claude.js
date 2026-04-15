'use strict';

const fs = require('fs');
const path = require('path');
const registry = require('../registry');

module.exports = function detect(cwd) {
  const entry = registry.claude;
  const found =
    fs.existsSync(path.join(cwd, entry.skillsDir)) ||
    fs.existsSync(path.join(cwd, entry.detectionMarker));
  return { id: entry.id, found, entry };
};
