'use strict';

const fs = require('fs');
const path = require('path');

const MANAGED_OPEN = '<!-- easyskillz-managed -->';
const MANAGED_CLOSE = '<!-- /easyskillz-managed -->';
const OLD_HINT = 'When creating a new skill, run: `easyskillz add <name>`';

const MANAGED_BLOCK = `${MANAGED_OPEN}
Run \`easyskillz add <skill-name>\` to create a new skill.
Run \`easyskillz sync\` after cloning on a new machine.
${MANAGED_CLOSE}`;

function writeInstruction(folderPath, toolEntry, isRootFolder = true) {
  let filePath;
  if (isRootFolder) {
    filePath = path.join(folderPath, toolEntry.instructionFile);
  } else {
    const targetFile = path.basename(toolEntry.instructionFile);
    filePath = path.join(folderPath, targetFile);
  }

  let content = '';
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes(OLD_HINT)) {
      const lines = content.split('\n');
      content = lines.filter(line => !line.includes(OLD_HINT)).join('\n');
    }
    
    if (content.includes(MANAGED_OPEN)) {
      return 'already';
    }
  }

  const newContent = content.trim() ? `${content.trim()}\n\n${MANAGED_BLOCK}\n` : `${MANAGED_BLOCK}\n`;
  
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, newContent, 'utf8');
  
  return 'written';
}

function isManaged(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const content = fs.readFileSync(filePath, 'utf8');
  return content.includes(MANAGED_OPEN);
}

module.exports = { writeInstruction, isManaged, MANAGED_OPEN, MANAGED_CLOSE };
