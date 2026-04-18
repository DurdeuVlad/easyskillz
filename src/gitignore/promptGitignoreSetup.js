'use strict';

const readline = require('readline');

function promptGitignoreSetup() {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      resolve({ gitignoreStrategy: 'full' });
      return;
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log('\nTool configurations created.\n');
    console.log('How should .gitignore be managed?\n');
    console.log('1. Full (recommended)');
    console.log('   - Gitignore all tool files (.claude/, CLAUDE.md, etc.)');
    console.log('   - Run `easyskillz sync` after cloning to regenerate');
    console.log('   - Zero merge conflicts, works with any team setup\n');
    console.log('2. Conflict-generating only');
    console.log('   - Gitignore only personal config files (settings.json, etc.)');
    console.log('   - Commit symlinks and instruction files');
    console.log('   - Requires team to use same tools and have symlink support\n');
    console.log('3. None (manual)');
    console.log('   - You manage .gitignore yourself');
    console.log('   - easyskillz won\'t modify it\n');

    rl.question('Choice [1/2/3]: ', (answer) => {
      rl.close();
      
      let strategy = 'full';
      if (answer === '2') {
        strategy = 'conflict-only';
      } else if (answer === '3') {
        strategy = 'none';
      }
      
      resolve({ gitignoreStrategy: strategy });
    });
  });
}

module.exports = { promptGitignoreSetup };
