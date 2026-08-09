'use strict';

const fs = require('fs');
const path = require('path');
const registry = require('../registry');

module.exports = function detect(cwd) {
  const entry = registry.cursor;
  const evidence = entry.detectionMarkers.filter((marker) => fs.existsSync(path.join(cwd, marker)));
  return { found: evidence.length > 0, evidence };
};
