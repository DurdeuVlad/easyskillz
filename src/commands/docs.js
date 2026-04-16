'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config');
const { scanAll } = require('../docs/scanInstructionFiles');
const { centralize, DOCS_DIR } = require('../docs/centralizeFiles');

async function docs({ cwd, subAction, args, json, isTTY }) {
  switch (subAction) {
    case '':
    case 'sync':
      return await docsSync({ cwd, json });
    case 'list':
      return await docsList({ cwd, json });
    default:
      process.stderr.write(`Error: unknown docs subcommand "${subAction}"\nUsage: easyskillz docs [sync|list]\n`);
      process.exit(1);
  }
}

async function docsSync({ cwd, json }) {
  const cfg = config.read(cwd);
  
  if (!cfg.manageDocs) {
    const msg = 'Docs management is not enabled. Run `easyskillz sync` to enable it.';
    if (json) {
      process.stdout.write(JSON.stringify({ ok: false, error: msg }) + '\n');
    } else {
      console.error(msg);
    }
    process.exit(1);
    return;
  }
  
  if (!json) console.log('Scanning for instruction files...');
  
  const scanned = scanAll(cwd);
  const fileCount = Object.values(scanned).flat().length;
  
  if (fileCount === 0) {
    if (!json) console.log('No instruction files found.');
    if (json) {
      process.stdout.write(JSON.stringify({ ok: true, centralized: 0 }) + '\n');
    }
    return;
  }
  
  if (!json) {
    console.log(`Found ${fileCount} instruction file(s) in ${Object.keys(scanned).length} folder(s)`);
    console.log('Centralizing...');
  }
  
  const actions = centralize(cwd, scanned, cfg.docsStrategy);
  
  if (!json) {
    console.log(`✓ Centralized ${actions.length} file(s) to .easyskillz/docs/`);
  }
  
  if (json) {
    process.stdout.write(JSON.stringify({ ok: true, centralized: actions.length }) + '\n');
  }
}

async function docsList({ cwd, json }) {
  const cfg = config.read(cwd);
  
  if (!cfg.manageDocs) {
    const msg = 'Docs management is not enabled. Run `easyskillz sync` to enable it.';
    if (json) {
      process.stdout.write(JSON.stringify({ ok: false, error: msg }) + '\n');
    } else {
      console.error(msg);
    }
    process.exit(1);
    return;
  }
  
  const docsPath = path.join(cwd, DOCS_DIR);
  
  if (!fs.existsSync(docsPath)) {
    if (!json) console.log('No centralized docs found.');
    if (json) {
      process.stdout.write(JSON.stringify({ ok: true, folders: [] }) + '\n');
    }
    return;
  }
  
  const folders = [];
  
  function scan(dir, relPath = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const newRelPath = relPath ? `${relPath}/${entry.name}` : entry.name;
        scan(path.join(dir, entry.name), newRelPath);
      } else if (entry.isFile()) {
        const folderRel = relPath || '.';
        let existing = folders.find(f => f.folder === folderRel);
        if (!existing) {
          existing = { folder: folderRel, files: [] };
          folders.push(existing);
        }
        existing.files.push(entry.name);
      }
    }
  }
  
  scan(docsPath);
  
  if (json) {
    process.stdout.write(JSON.stringify({ ok: true, folders }) + '\n');
  } else {
    if (folders.length === 0) {
      console.log('No centralized docs found.');
    } else {
      console.log(`\nCentralized instruction files (strategy: ${cfg.docsStrategy}):\n`);
      for (const { folder, files } of folders) {
        console.log(`  ${folder}/`);
        for (const file of files) {
          console.log(`    - ${file}`);
        }
      }
    }
  }
}

module.exports = docs;
