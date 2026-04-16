'use strict';

const fs = require('fs');
const path = require('path');

const CONFIG_DIR = '.easyskillz';
const SKILLS_DIR = '.easyskillz/skills';
const CONFIG_FILE = '.easyskillz/easyskillz.json';

const DEFAULTS = {
  tools: [],
  linkStrategy: 'symlink', // 'symlink' | 'stub'
  manageDocs: false, // all-in or all-out instruction file management
  docsStrategy: null, // 'unified' | 'tool-specific' | null (not chosen yet)
};

function read(cwd) {
  const filePath = path.join(cwd, CONFIG_FILE);
  if (!fs.existsSync(filePath)) return { ...DEFAULTS };
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

function write(cwd, config) {
  const dir = path.join(cwd, CONFIG_DIR);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(cwd, CONFIG_FILE),
    JSON.stringify(config, null, 2) + '\n',
    'utf8'
  );
}

function skillsPath(cwd) {
  return path.join(cwd, SKILLS_DIR);
}

function listSkills(cwd) {
  const dir = skillsPath(cwd);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((name) =>
    fs.statSync(path.join(dir, name)).isDirectory()
  );
}

module.exports = { read, write, skillsPath, listSkills, CONFIG_DIR, SKILLS_DIR };
