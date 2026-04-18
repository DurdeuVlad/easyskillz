'use strict';

const fs = require('fs');
const path = require('path');
const { isManaged } = require('./syncFolder');

function listInstructionFiles(cwd, config, registry) {
  const result = [];
  const folders = config.docsFolders.length > 0 ? config.docsFolders : ['.'];
  
  for (const folder of folders) {
    const folderPath = path.join(cwd, folder);
    
    for (const toolId of config.tools) {
      const toolEntry = registry[toolId];
      if (!toolEntry) continue;

      const isRoot = folder === '.';
      const filePath = isRoot
        ? path.join(cwd, toolEntry.instructionFile)
        : path.join(folderPath, path.basename(toolEntry.instructionFile));
      
      result.push({
        folder,
        toolId,
        toolName: toolEntry.name,
        filePath,
        exists: fs.existsSync(filePath),
        managed: isManaged(filePath),
      });
    }
  }
  
  return result;
}

module.exports = { listInstructionFiles };
