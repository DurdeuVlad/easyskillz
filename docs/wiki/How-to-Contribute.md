# How to Contribute

We welcome contributions of all kinds—whether it's fixing bugs, enhancing documentation, or adding support for new AI coding tools! 

To keep the codebase maintainable, fast, and easy for AI agents to interact with, we strictly enforce several coding and design principles.

---

## 🛠️ Development Setup

Getting started is simple. Since `easyskillz` has **zero runtime dependencies**, you do not need to run `npm install` unless you want to run the test suite (which uses Node's native test runner but has devDependencies for formatting/linting).

```bash
# Clone the repository
git clone https://github.com/DurdeuVlad/easyskillz.git
cd easyskillz

# Test the local executable
node bin/easyskillz.js --help
```

---

## 📐 Coding Conventions & Guidelines

All code contributions must adhere to the following rules:

### 1. Zero Runtime Dependencies
*   We **do not allow** any third-party runtime dependencies (e.g., `chalk`, `commander`, `inquirer`, `lodash`, etc.).
*   Only use Node.js built-in modules (`fs`, `path`, `os`, `readline`, `child_process`).
*   This keeps the tool instantly executable, secure, and lightweight for AI agents to run.

### 2. CommonJS Modules
*   Use plain CommonJS (`require` and `module.exports`).
*   Do not use ES Modules (`import`/`export`) or compile steps (Babel, TypeScript). The codebase runs directly in Node.js.

### 3. Strict Idempotency
*   Every write, update, or directory creation must be idempotent.
*   **Always check before doing**: verify if the directory or symlink already exists before attempting to create it.
*   Running `easyskillz project sync` repeatedly on the same project must produce the exact same filesystem state without throwing errors or creating duplicate entries.

### 4. Glass Box Principle
*   Do not perform silent filesystem operations.
*   Always print to stdout/stderr what the CLI is doing (e.g., `✓ Wired skill-name -> Claude Code`).
*   If running in `--json` mode, ensure the command prints valid, parseable JSON and exits with `0` on success or `1` on error.

---

## 🧪 Testing Workflow

Before opening a pull request, you must verify that the test suite passes completely.

### Running Tests
Execute the test runner:
```bash
npm test
```
This runs:
*   **Unit Tests** (`tests/*.test.js`): Testing individual components like config readers, gitignore writers, and path utilities.
*   **Detector Tests** (`tests/detectors/*.test.js`): Verifying each tool detector correctly identifies the tool's environment.
*   **E2E Scenarios** (`tests/e2e/scenarios.test.js`): Simulating real developer workspaces, switching tools, and verifying symlinks/adapters are wired properly.

---

## 🚀 Step-by-Step: Adding a New AI Tool

Adding support for a new AI tool requires three simple steps:

### Step 1: Update the Registry
Edit [`src/registry.js`](file:///e:/Github2/easyskillz/src/registry.js) to define the tool's properties:
```javascript
mytool: {
  id: 'mytool',
  name: 'My Tool CLI',
  skillsDir: '.mytool/skills',               // Target directory for skills
  instructionFile: '.mytool/instructions.md',// File where instruction stubs are written
  detectionMarkers: ['.mytool'],             // Files/folders unique to this tool
}
```
> [!IMPORTANT]
> The `detectionMarkers` must be unique to this tool. Never use shared marker files (like `AGENTS.md`) as detection markers.

### Step 2: Create a Detector
Create a new detector file at `src/detectors/mytool.js`:
```javascript
'use strict';

const fs = require('fs');
const path = require('path');
const registry = require('../registry');

module.exports = function detect(cwd) {
  const entry = registry.mytool;
  const found =
    fs.existsSync(path.join(cwd, entry.skillsDir)) ||
    entry.detectionMarkers.some((marker) => fs.existsSync(path.join(cwd, marker)));
  return { id: entry.id, found, entry };
};
```

### Step 3: Register the Detector
Require and register your detector in [`src/init/detect.js`](file:///e:/Github2/easyskillz/src/init/detect.js):
```javascript
const DETECTORS = {
  // ...existing detectors
  mytool: require('../detectors/mytool'),
};
```

---

## 📋 Pull Request Checklist

Before opening a PR, ensure you have completed the following:

- [ ] All unit, detector, and E2E tests pass cleanly (`npm test`).
- [ ] No new runtime dependencies have been introduced.
- [ ] The CLI outputs are helpful, concise, and support `--json` output.
- [ ] Any new CLI features or tool additions are fully documented in the `README.md`.
- [ ] All code modifications maintain backward-compatibility and are fully idempotent.
