'use strict';

const readline = require('readline');

function promptDocsSetup() {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      resolve({ manageDocs: false, docsStrategy: null });
      return;
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log('\neasyskillz can manage instruction files (CLAUDE.md, AGENTS.md, etc.) across your entire repo.\n');
    console.log('This will:');
    console.log('  - Scan all directories for existing instruction files');
    console.log('  - Centralize them in .easyskillz/docs/');
    console.log('  - Replace them with symlinks (gitignored)');
    console.log('  - Auto-detect and manage new folders going forward\n');

    rl.question('Enable instruction file management? [Y/n] ', (answer) => {
      const enable = !answer || answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
      
      if (!enable) {
        rl.close();
        resolve({ manageDocs: false, docsStrategy: null });
        return;
      }

      console.log('\nChoose a strategy:\n');
      console.log('1. Unified (recommended)');
      console.log('   - One INSTRUCTION.md per folder');
      console.log('   - All tools read the same content');
      console.log('   - Example: .easyskillz/docs/src/INSTRUCTION.md → /src/CLAUDE.md, /src/AGENTS.md\n');
      console.log('2. Tool-specific');
      console.log('   - Separate file per tool per folder');
      console.log('   - Different content for each tool');
      console.log('   - Example: .easyskillz/docs/src/CLAUDE.md → /src/CLAUDE.md');
      console.log('             .easyskillz/docs/src/AGENTS.md → /src/AGENTS.md\n');

      rl.question('Strategy [1/2]: ', (strategyAnswer) => {
        rl.close();
        
        const strategy = strategyAnswer === '2' ? 'tool-specific' : 'unified';
        resolve({ manageDocs: true, docsStrategy: strategy });
      });
    });
  });
}

module.exports = { promptDocsSetup };
