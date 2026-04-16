'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config');
const registry = require('../registry');
const { writeInstruction, isManaged } = require('../docs/syncFolder');
const { listInstructionFiles } = require('../docs/listFolders');

async function docs({ cwd, subAction, args, json, isTTY }) {
  switch (subAction) {
    case '':
    case 'sync':
      return await docsSync({ cwd, json });
    case 'list':
      return await docsList({ cwd, json });
    case 'add':
      return await docsAdd({ cwd, args, json });
    case 'remove':
      return await docsRemove({ cwd, args, json });
    default:
      process.stderr.write(`Error: unknown docs subcommand "${subAction}"\nUsage: easyskillz docs [sync|list|add|remove]\n`);
      process.exit(1);
  }
}

async function docsSync({ cwd, json }) {
  const cfg = config.read(cwd);
  
  if (cfg.docsFolders.length === 0) {
    cfg.docsFolders = ['.'];
    config.write(cwd, cfg);
  }
  
  const results = [];
  
  for (const folder of cfg.docsFolders) {
    const folderPath = path.join(cwd, folder);
    const isRootFolder = folder === '.';
    
    if (!fs.existsSync(folderPath)) {
      if (!json) {
        console.warn(`Warning: folder ${folder} does not exist, skipping`);
      }
      continue;
    }
    
    for (const toolId of cfg.tools) {
      const toolEntry = registry[toolId];
      if (!toolEntry) continue;
      
      const status = writeInstruction(folderPath, toolEntry, isRootFolder);
      results.push({ folder, toolId, status });
      
      if (!json && status === 'written') {
        const targetFile = path.basename(toolEntry.instructionFile);
        console.log(`✓ ${folder}/${targetFile}`);
      }
    }
  }
  
  if (json) {
    console.log(JSON.stringify({ ok: true, results }));
  } else if (results.every(r => r.status === 'already')) {
    console.log('All instruction files are up to date.');
  }
}

async function docsList({ cwd, json }) {
  const cfg = config.read(cwd);
  const files = listInstructionFiles(cwd, cfg, registry);
  
  if (json) {
    console.log(JSON.stringify({ ok: true, files }));
  } else {
    if (files.length === 0) {
      console.log('No instruction files tracked.');
      return;
    }
    
    console.log('\nFolder          Tool                File                        Status');
    console.log('─'.repeat(80));
    
    for (const f of files) {
      const folder = f.folder.padEnd(15);
      const tool = f.toolName.padEnd(19);
      const file = path.basename(f.filePath).padEnd(27);
      const status = f.exists ? (f.managed ? 'managed' : 'unmanaged') : 'missing';
      console.log(`${folder} ${tool} ${file} ${status}`);
    }
    console.log();
  }
}

async function docsAdd({ cwd, args, json }) {
  const folder = args[0];
  
  if (!folder) {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: 'Folder argument required' }));
    } else {
      console.error('Usage: easyskillz docs add <folder>');
    }
    process.exit(1);
  }
  
  const folderPath = path.join(cwd, folder);
  
  if (!fs.existsSync(folderPath)) {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: 'Folder does not exist' }));
    } else {
      console.error(`Error: folder ${folder} does not exist`);
    }
    process.exit(1);
  }
  
  if (!fs.statSync(folderPath).isDirectory()) {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: 'Path is not a directory' }));
    } else {
      console.error(`Error: ${folder} is not a directory`);
    }
    process.exit(1);
  }
  
  const result = config.addDocsFolder(cwd, folder);
  
  if (result === 'already') {
    if (json) {
      console.log(JSON.stringify({ ok: true, status: 'already' }));
    } else {
      console.log(`Folder ${folder} is already tracked.`);
    }
    return;
  }
  
  const cfg = config.read(cwd);
  const written = [];
  const isRootFolder = false;
  
  for (const toolId of cfg.tools) {
    const toolEntry = registry[toolId];
    if (!toolEntry) continue;
    
    const status = writeInstruction(folderPath, toolEntry, isRootFolder);
    if (status === 'written') {
      written.push(path.basename(toolEntry.instructionFile));
    }
  }
  
  if (json) {
    console.log(JSON.stringify({ ok: true, status: 'added', written }));
  } else {
    console.log(`✓ Added ${folder}`);
    if (written.length > 0) {
      console.log(`  Created: ${written.join(', ')}`);
    }
  }
}

async function docsRemove({ cwd, args, json }) {
  const folder = args[0];
  
  if (!folder) {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: 'Folder argument required' }));
    } else {
      console.error('Usage: easyskillz docs remove <folder>');
    }
    process.exit(1);
  }
  
  const normalized = path.relative(cwd, path.resolve(cwd, folder)).split(path.sep).join('/') || '.';
  
  if (normalized === '.') {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: 'Cannot remove root folder' }));
    } else {
      console.error('Error: cannot remove root folder (.)');
    }
    process.exit(1);
  }
  
  const result = config.removeDocsFolder(cwd, folder);
  
  if (result === 'notFound') {
    if (json) {
      console.log(JSON.stringify({ ok: true, status: 'notFound' }));
    } else {
      console.log(`Folder ${folder} is not tracked.`);
    }
    return;
  }
  
  const folderPath = path.join(cwd, folder);
  const cfg = config.read(cwd);
  const deleted = [];
  
  const filesToDelete = new Set();
  
  for (const toolId of cfg.tools) {
    const toolEntry = registry[toolId];
    if (!toolEntry) continue;
    
    const targetFile = path.basename(toolEntry.instructionFile);
    const filePath = path.join(folderPath, targetFile);
    
    if (isManaged(filePath)) {
      filesToDelete.add(filePath);
    }
  }
  
  for (const filePath of filesToDelete) {
    try {
      fs.unlinkSync(filePath);
      deleted.push(path.basename(filePath));
    } catch (err) {
    }
  }
  
  if (json) {
    console.log(JSON.stringify({ ok: true, status: 'removed', deleted }));
  } else {
    console.log(`✓ Removed ${folder}`);
    if (deleted.length > 0) {
      console.log(`  Deleted: ${deleted.join(', ')}`);
    }
  }
}

module.exports = docs;
