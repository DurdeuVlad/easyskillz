'use strict';

const fs = require('fs');
const path = require('path');
const { defaultConfig, validateSchema2, normalizeLegacy } = require('./config/schema');
const { writeFileAtomic } = require('./fs/atomic');

const CONFIG_DIR = '.easyskillz';
const SKILLS_DIR = '.easyskillz/skills';
const CONFIG_FILE = '.easyskillz/easyskillz.json';

function read(cwd) {
  const filePath = path.join(cwd, CONFIG_FILE);
  if (!fs.existsSync(filePath)) return { ok: true, kind: 'missing', migrationRequired: false, config: defaultConfig() };
  let value;
  try { value = JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch (cause) { return { ok: false, error: { code: 'E_CONFIG_PARSE', message: `cannot parse ${CONFIG_FILE}`, details: { cause: cause.message } } }; }
  if (value && value.schemaVersion === 2) {
    const result = validateSchema2(value);
    return result.ok ? { ok: true, kind: 'schema2', migrationRequired: false, config: result.config } : result;
  }
  const result = normalizeLegacy(value);
  return result.ok ? { ok: true, kind: 'schema1', migrationRequired: true, config: result.config, legacy: value } : result;
}

function write(cwd, value) {
  const validated = validateSchema2(value);
  if (!validated.ok) return validated;
  writeFileAtomic(cwd, CONFIG_FILE, Buffer.from(`${JSON.stringify(validated.config, null, 2)}\n`));
  return { ok: true, config: validated.config };
}

function skillsPath(cwd) { return path.join(cwd, SKILLS_DIR); }
function listSkills(cwd) {
  const dir = skillsPath(cwd);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

module.exports = { read, write, skillsPath, listSkills, CONFIG_DIR, SKILLS_DIR, CONFIG_FILE, defaultConfig };
