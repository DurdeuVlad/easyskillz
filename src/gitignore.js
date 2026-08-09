'use strict';

const START = '# easyskillz-start';
const END = '# easyskillz-end';

function renderManagedIgnore(artifacts = []) {
  const lines = [...new Set(artifacts.map((item) => `/${String(item).replace(/^[/\\]+/, '').replace(/\\/g, '/')}`))].sort();
  if (!lines.includes('/.easyskillz/state.json')) lines.push('/.easyskillz/state.json');
  lines.sort();
  return `${START}\n${lines.join('\n')}\n${END}\n`;
}

function inspectBroadRules(content) {
  const issues = [];
  for (const [index, raw] of String(content || '').split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const broadInstruction = /^(?:\*\*\/)?(?:AGENTS|CLAUDE|GEMINI)\.md$/i.test(line.replace(/^\//, ''));
    const broadToolRoot = /^\/?\.(?:agents|claude|codex|cursor|gemini|windsurf|devin)\/?$/i.test(line);
    if (broadInstruction || broadToolRoot) issues.push({ code: 'W_IGNORE_BROAD', severity: 'warning', path: '.gitignore', message: `broad legacy ignore rule: ${line}`, details: { line: index + 1, rule: line } });
  }
  return issues;
}

function replaceManagedBlock(content, block) {
  const text = String(content || '');
  const start = text.indexOf(START);
  const end = text.indexOf(END, start + START.length);
  if (start !== -1 && end !== -1) {
    const after = end + END.length;
    return `${text.slice(0, start)}${block.trimEnd()}${text.slice(after)}`.replace(/\n{3,}/g, '\n\n');
  }
  const prefix = text && !text.endsWith('\n') ? `${text}\n\n` : text;
  return `${prefix}${block}`;
}

module.exports = { START, END, renderManagedIgnore, inspectBroadRules, replaceManagedBlock };
