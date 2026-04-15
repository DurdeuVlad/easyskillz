# Contributing

## Adding a New Tool

One PR = one new detector file + one registry entry.

### Step 1 — Add to registry

Edit [`src/registry.js`](src/registry.js) and add your tool:

```js
mytool: {
  id: 'mytool',
  name: 'My Tool',
  skillsDir: '.mytool/skills',
  instructionFile: '.mytool/instructions.md', // file easyskillz appends the hint line to
  detectionMarker: '.mytool',                 // tool-specific path used ONLY for detection
},
```

`detectionMarker` must be a path that is **unique to this tool** — never a file shared with other tools (e.g. `AGENTS.md` is shared by Codex, Cursor, and Windsurf and must not be used as a detection marker).

### Step 2 — Create a detector

Create `src/detectors/mytool.js`:

```js
'use strict';

const fs = require('fs');
const path = require('path');
const registry = require('../registry');

module.exports = function detect(cwd) {
  const entry = registry.mytool;
  const found =
    fs.existsSync(path.join(cwd, entry.skillsDir)) ||
    fs.existsSync(path.join(cwd, entry.detectionMarker));
  return { id: entry.id, found, entry };
};
```

### Step 3 — Wire the detector into init

Add your detector to the `DETECTORS` map in [`src/init/detect.js`](src/init/detect.js):

```js
const DETECTORS = {
  // ...existing entries...
  mytool: require('../detectors/mytool'),
};
```

File: `src/init/detect.js`

That's it. Open a PR.

## Code Style

- Plain CommonJS, no build step, zero runtime dependencies (`fs`, `path`, `os`, `readline` only)
- Every operation must be idempotent — check before acting
- Glass box — print what you're doing before doing it, one confirmation at the end
- Max 3 questions to the user in any command, ever

## What We Won't Merge

- Runtime dependencies (`chalk`, `commander`, `inquirer`, etc.)
- Non-idempotent operations
- Silent side effects (filesystem writes with no output)
- New commands without `--json` support and proper exit codes

## Smoke Test

Before opening a PR, verify your detector works end-to-end:

```bash
mkdir /tmp/test-tool && cd /tmp/test-tool
# create the marker file your detector looks for
touch <your-tool-marker>
node /path/to/easyskillz/bin/easyskillz.js sync
# your tool should appear in the detected list
```
