'use strict';

const path = require('path');
const registry = require('../registry');

function targetName(kind, name) {
  if (kind === 'cursor-mdc') return `${name}.mdc`;
  if (kind === 'devin-desktop-workflow') return `${name}.md`;
  return name;
}

function planTargets({ skills, surfaces, materialization = 'auto' }) {
  const byTarget = new Map();
  for (const skill of [...skills].sort((a, b) => a.name.localeCompare(b.name))) {
    for (const surfaceId of [...surfaces].sort()) {
      const entry = registry[surfaceId];
      if (!entry) { const error = new Error(`unknown surface: ${surfaceId}`); error.code = 'E_CONFIG_VALUE'; throw error; }
      for (const descriptor of entry.skillTargets) {
        if (descriptor.when === 'workflow' && !skill.workflow) continue;
        const target = path.posix.join(descriptor.path, targetName(descriptor.kind, skill.name));
        const producer = `${descriptor.kind}:${skill.name}`;
        const existing = byTarget.get(target);
        if (existing && existing.producer !== producer) { const error = new Error(`divergent producers for ${target}`); error.code = 'E_TARGET_COLLISION'; throw error; }
        if (existing) { if (!existing.consumers.includes(surfaceId)) existing.consumers.push(surfaceId); existing.consumers.sort(); continue; }
        byTarget.set(target, {
          type: 'materialize', producer, kind: descriptor.kind, source: path.posix.join('.easyskillz/skills', skill.name), target,
          requested: descriptor.kind === 'native' ? materialization : 'transform', consumers: [surfaceId], skill,
        });
      }
    }
  }
  return [...byTarget.values()].sort((a, b) => a.target.localeCompare(b.target));
}

module.exports = { planTargets };
