'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config');
const detect = require('../init/detect');
const { plan } = require('../init/plan');
const execute = require('../init/execute');

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    e.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}

async function exportCmd({ cwd, args, json, isTTY }) {
  let targetPath = null;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--target' && i + 1 < args.length) {
      targetPath = args[i + 1];
      break;
    } else if (args[i].startsWith('--target=')) {
      targetPath = args[i].substring('--target='.length);
      break;
    }
  }
  
  if (!targetPath) {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: '--target argument required' }));
    } else {
      console.error('Usage: easyskillz export --target <path>');
    }
    process.exit(1);
  }
  
  const resolvedTarget = path.resolve(cwd, targetPath);
  
  if (!fs.existsSync(resolvedTarget)) {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: 'Target path does not exist' }));
    } else {
      console.error(`Error: target path ${targetPath} does not exist`);
    }
    process.exit(1);
  }
  
  if (!fs.statSync(resolvedTarget).isDirectory()) {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: 'Target path is not a directory' }));
    } else {
      console.error(`Error: target path ${targetPath} is not a directory`);
    }
    process.exit(1);
  }
  
  if (path.resolve(resolvedTarget) === path.resolve(cwd)) {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: 'Target path cannot be the same as source' }));
    } else {
      console.error('Error: target path cannot be the same as source');
    }
    process.exit(1);
  }
  
  const sourceConfig = config.read(cwd);
  const sourceSkills = config.listSkills(cwd).filter(s => s !== '_easyskillz');
  
  const targetConfig = config.read(resolvedTarget);
  const targetSkills = config.listSkills(resolvedTarget);
  
  const skillsToSkip = sourceSkills.filter(s => targetSkills.includes(s));
  const skillsToCopy = sourceSkills.filter(s => !targetSkills.includes(s));
  
  const mergedTools = [...new Set([...targetConfig.tools, ...sourceConfig.tools])];
  
  if (!json) {
    console.log('\nExport plan:');
    console.log(`  Source: ${cwd}`);
    console.log(`  Target: ${resolvedTarget}`);
    console.log(`  Skills to copy: ${skillsToCopy.length > 0 ? skillsToCopy.join(', ') : 'none'}`);
    if (skillsToSkip.length > 0) {
      console.log(`  Skills to skip (already exist): ${skillsToSkip.join(', ')}`);
    }
    console.log(`  Tools: ${mergedTools.join(', ')}`);
    console.log('');
  }
  
  if (isTTY && !json) {
    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise((resolve) => rl.question('Proceed? [Y/n] ', resolve));
    rl.close();
    if (answer.trim().toLowerCase() === 'n') {
      console.log('Aborted.');
      process.exit(0);
    }
    console.log('');
  }
  
  for (const skill of skillsToCopy) {
    const srcPath = path.join(cwd, '.easyskillz', 'skills', skill);
    const dstPath = path.join(resolvedTarget, '.easyskillz', 'skills', skill);
    copyDir(srcPath, dstPath);
    if (!json) {
      console.log(`  ✓ Copied ${skill}`);
    }
  }
  
  const newTargetConfig = {
    ...targetConfig,
    tools: mergedTools,
  };
  config.write(resolvedTarget, newTargetConfig);
  
  if (!json) {
    console.log('  ✓ Updated config');
    console.log('');
    console.log('Running sync at target...');
    console.log('');
  }
  
  const out = json ? () => {} : console.log;
  const detectionResult = detect(resolvedTarget, out);
  // Truly disable auto-repair during export to maintain idempotency in target
  const skipAutoRepair = true;
  const actions = await plan(resolvedTarget, detectionResult.toolIds, detectionResult.strategy, out, false, true);
  
  if (actions && actions.length > 0) {
    execute(resolvedTarget, detectionResult.toolIds, detectionResult.strategy, actions, out, skipAutoRepair);
  }
  
  if (json) {
    console.log(JSON.stringify({
      ok: true,
      copied: skillsToCopy,
      skipped: skillsToSkip,
      targetPath: resolvedTarget,
      tools: mergedTools,
    }));
  } else {
    console.log('');
    console.log('✓ Export complete');
  }
}

module.exports = exportCmd;
