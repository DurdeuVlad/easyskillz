# Development Guide

Everything you need to run and contribute to easyskillz locally.

## Requirements

- Node.js >= 18

## Setup

```bash
git clone https://github.com/DurdeuVlad/easyskillz
cd easyskillz
```

No `npm install` needed — zero runtime dependencies.

## Run Locally

```bash
node bin/easyskillz.js --help
node bin/easyskillz.js sync
node bin/easyskillz.js add <name>
node bin/easyskillz.js register <tool>
```

## Test

```bash
npm test
```

Manual smoke test against a scratch project:

```bash
mkdir /tmp/test-project && cd /tmp/test-project
touch CLAUDE.md
node /path/to/easyskillz/bin/easyskillz.js sync
node /path/to/easyskillz/bin/easyskillz.js add my-skill
node /path/to/easyskillz/bin/easyskillz.js register cursor
```

## Project Structure

```
bin/
  easyskillz.js       ← CLI entry point, argv parsing
src/
  registry.js         ← all supported tools + their paths
  config.js           ← read/write .easyskillz/easyskillz.json
  wirer.js            ← symlink probe, wire, stub, gitignore logic
  detectors/          ← one file per tool, detects if it's present
  init/
    detect.js         ← scan tools, read config, probe symlinks
    plan.js           ← scan unwired skills, build action list, confirm
    execute.js        ← apply the plan
  commands/
    sync.js           ← orchestrator (calls detect → plan → execute)
    add.js            ← create skill + wire to all tools
    register.js       ← add tool + wire all existing skills
index.js              ← programmatic API entry point
```

## Adding a New Tool

See [CONTRIBUTING.md](CONTRIBUTING.md) for the step-by-step template.

## Debug Mode

Set `DEBUG=1` to print full stack traces on errors:

```bash
DEBUG=1 node bin/easyskillz.js sync
```
