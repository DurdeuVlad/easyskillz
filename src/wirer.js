'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// Test whether symlinks can be created in this environment.
// Uses a temp dir so we never pollute the project.
function probeSymlinks() {
  const src = path.join(os.tmpdir(), `easyskillz-probe-src-${Date.now()}`);
  const dst = path.join(os.tmpdir(), `easyskillz-probe-dst-${Date.now()}`);
  try {
    fs.mkdirSync(src);
    const type = process.platform === 'win32' ? 'junction' : undefined;
    fs.symlinkSync(src, dst, type);
    const resolved = fs.realpathSync(dst);
    return resolved.toLowerCase() === src.toLowerCase();
  } catch {
    return false;
  } finally {
    try { fs.rmSync(src, { recursive: true, force: true }); } catch {}
    try { fs.rmSync(dst, { recursive: true, force: true }); } catch {}
  }
}

// Check whether a path is already correctly wired (symlink to right src, or stub file present).
function isWired(targetDir, skillName, srcPath, strategy, toolEntry) {
  const isWorkflow = toolEntry && toolEntry.type === 'workflows';
  const target = isWorkflow
    ? path.join(targetDir, skillName + '.md')
    : path.join(targetDir, skillName);

  if (!fs.existsSync(target)) return false;

  if (strategy === 'symlink') {
    try {
      const stat = fs.lstatSync(target);
      if (!stat.isSymbolicLink()) return false;
      const resolved = fs.realpathSync(target);
      const expectedSrc = isWorkflow
        ? path.join(srcPath, 'SKILL.md')
        : srcPath;
      return resolved.toLowerCase() === expectedSrc.toLowerCase();
    } catch {
      return false;
    }
  }
  // stub
  const stubFile = isWorkflow ? target : path.join(target, 'SKILL.md');
  if (!fs.existsSync(stubFile)) return false;
  const content = fs.readFileSync(stubFile, 'utf8');
  return content.includes('easyskillz') && content.includes(skillName);
}

// Wire a single skill into a tool's skills directory.
// For workflow-type tools, wires SKILL.md as a flat .md file (skill-name.md).
// Returns 'wired' | 'already'
function wireSkill(skillName, toolEntry, cwd, strategy) {
  const srcPath = path.resolve(cwd, '.easyskillz', 'skills', skillName);
  const toolSkillsDir = path.resolve(cwd, toolEntry.skillsDir);
  const isWorkflow = toolEntry.type === 'workflows';
  const target = isWorkflow
    ? path.join(toolSkillsDir, skillName + '.md')
    : path.join(toolSkillsDir, skillName);

  if (isWired(toolSkillsDir, skillName, srcPath, strategy, toolEntry)) return 'already';

  fs.mkdirSync(toolSkillsDir, { recursive: true });

  try {
    const lstat = fs.lstatSync(target);
    if (lstat.isSymbolicLink() || lstat.isDirectory() || lstat.isFile()) {
      fs.rmSync(target, { recursive: true, force: true });
    }
  } catch {
    // target doesn't exist — nothing to remove
  }

  if (isWorkflow) {
    // Workflows are flat .md files — symlink SKILL.md directly or write stub
    const skillMd = path.join(srcPath, 'SKILL.md');
    if (strategy === 'symlink') {
      try {
        fs.symlinkSync(skillMd, target);
      } catch {
        fs.writeFileSync(target, stubContent(skillName), 'utf8');
      }
    } else {
      fs.writeFileSync(target, stubContent(skillName), 'utf8');
    }
  } else if (strategy === 'symlink') {
    try {
      const type = process.platform === 'win32' ? 'junction' : undefined;
      fs.symlinkSync(srcPath, target, type);
    } catch {
      // symlink failed despite probe passing — fall back to stub
      fs.mkdirSync(target, { recursive: true });
      fs.writeFileSync(path.join(target, 'SKILL.md'), stubContent(skillName), 'utf8');
    }
  } else {
    fs.mkdirSync(target, { recursive: true });
    fs.writeFileSync(path.join(target, 'SKILL.md'), stubContent(skillName), 'utf8');
  }
  return 'wired';
}

function stubContent(skillName) {
  const relPath = path.join('.easyskillz', 'skills', skillName, 'SKILL.md');
  return [
    `# ${skillName}`,
    '',
    '> **Managed by easyskillz** — symlinks are not available in this environment.',
    `> Read the actual skill from: \`${relPath}\``,
    '',
    `The source skill lives at \`.easyskillz/skills/${skillName}/\`.`,
    'Run `easyskillz sync` to re-wire after cloning.',
  ].join('\n') + '\n';
}

// Wire all skills in .easyskillz/skills/ to a single tool.
function wireAllSkills(toolEntry, cwd, strategy) {
  const skillsDir = path.join(cwd, '.easyskillz', 'skills');
  if (!fs.existsSync(skillsDir)) return [];
  const skills = fs.readdirSync(skillsDir).filter((n) =>
    fs.statSync(path.join(skillsDir, n)).isDirectory()
  );
  return skills.map((name) => ({
    skill: name,
    result: wireSkill(name, toolEntry, cwd, strategy),
  }));
}

// Scan for skills missing from any registered tool's skills dir.
function scanUnwired(cwd, config, registry) {
  const skillsDir = path.join(cwd, '.easyskillz', 'skills');
  if (!fs.existsSync(skillsDir)) return [];
  const skills = fs.readdirSync(skillsDir).filter((n) =>
    fs.statSync(path.join(skillsDir, n)).isDirectory()
  );
  const missing = [];
  for (const skill of skills) {
    for (const toolId of config.tools) {
      const entry = registry[toolId];
      if (!entry) continue;
      const srcPath = path.resolve(cwd, '.easyskillz', 'skills', skill);
      const toolSkillsDir = path.resolve(cwd, entry.skillsDir);
      if (!isWired(toolSkillsDir, skill, srcPath, config.linkStrategy)) {
        missing.push({ skill, toolId, entry });
      }
    }
  }
  return missing;
}

// Append the easyskillz line to a tool's instruction file. Idempotent.
function appendInstruction(cwd, toolEntry) {
  const filePath = path.resolve(cwd, toolEntry.instructionFile);
  const line = 'When creating a new skill, run: `easyskillz add <name>`';
  let existing = '';
  if (fs.existsSync(filePath)) {
    existing = fs.readFileSync(filePath, 'utf8');
    if (existing.includes(line)) return 'already';
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const prefix = existing && !existing.endsWith('\n') ? '\n' : '';
  fs.appendFileSync(filePath, `${prefix}${line}\n`, 'utf8');
  return 'appended';
}

// Add tool skill dirs and instruction files to .gitignore. Idempotent.
function updateGitignore(cwd, toolEntries) {
  const filePath = path.join(cwd, '.gitignore');
  let existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  const marker = '# easyskillz — tool skill dirs are machine-local';
  if (existing.includes(marker)) return 'already';

  // Deduplicate instruction files (multiple tools may share a path)
  const instrFiles = [...new Set(toolEntries.map((e) => e.instructionFile))];

  const lines = [
    '',
    marker,
    '# run `easyskillz sync` after cloning to re-wire',
    ...toolEntries.map((e) => e.skillsDir + '/'),
    '',
    '# easyskillz — instruction files are machine/tool-specific',
    ...instrFiles,
    '',
  ].join('\n');
  fs.appendFileSync(filePath, lines, 'utf8');
  return 'updated';
}

module.exports = {
  probeSymlinks,
  wireSkill,
  wireAllSkills,
  scanUnwired,
  appendInstruction,
  updateGitignore,
  isWired,
};
