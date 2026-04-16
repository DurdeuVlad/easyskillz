'use strict';

module.exports = {
  sync:      require('./src/commands/sync'),
  add:       require('./src/commands/add'),
  register:  require('./src/commands/register'),
  docs:      require('./src/commands/docs'),
  exportCmd: require('./src/commands/export'),
};
