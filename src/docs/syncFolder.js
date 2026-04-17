'use strict';

const fs = require('fs');
const path = require('path');

const MANAGED_OPEN = '<!-- easyskillz-managed -->';
const MANAGED_CLOSE = '<!-- /easyskillz-managed -->';
const OLD_HINT = 'When creating a new skill, run: `easyskillz add <name>`';

const MANAGED_BLOCK = `${MANAGED_OPEN}
## easyskillz — Skill Management

This project uses [easyskillz](https://github.com/DurdeuVlad/easyskillz) to manage AI agent skills.

**Creating skills:**
\`\`\`bash
easyskillz add <skill-name>  # Creates skill and wires to all tools
\`\`\`

**After cloning:**
\`\`\`bash
easyskillz sync  # Regenerates symlinks and wires skills
\`\`\`

Skills live in \`.easyskillz/skills/\` (source of truth, committed to git).
Tool directories like \`.claude/skills/\` are symlinks (gitignored, regenerated on sync).

See the \`easyskillz-reference\` skill for complete documentation.
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
