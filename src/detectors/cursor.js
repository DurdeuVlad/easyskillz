'use strict';

const fs = require('fs');
const path = require('path');
const registry = require('../registry');

module.exports = function detect(cwd) {
  const entry = registry.cursor;
  const found = entry.detectionMarkers.some((marker) => fs.existsSync(path.join(cwd, marker)));
  return { id: entry.id, found, entry };
};
