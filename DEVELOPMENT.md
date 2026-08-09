# Development

Easyskillz 0.5.1 requires Node.js 22+ and remains CommonJS. The only runtime dependency is `yaml` 2.x; `node-pty` is development-only for PTY/ConPTY contract coverage.

## Setup

```bash
npm ci
npm test
```

The executable is the CLI-only public API. Internal modules are implementation details and may change without a compatibility shim.

## Architecture

The runtime follows one direction:

```text
CLI schema → parse/validate → dispatch → readers → plan → preview/confirm → apply → state
```

- `src/cli/` owns grammar, aliases, streams, envelopes, and exits.
- Config and skill-document readers return explicit diagnostics without mutation.
- The planner deduplicates shared physical outputs and rejects collisions before writes.
- Filesystem helpers enforce containment, hashing, sibling staging, atomic replacement, and recovery.
- Native outputs link or copy complete skill directories. Six retained surfaces share `.agents/skills`; Claude Code uses `.claude/skills`.
- `.easyskillz/state.json` records local ownership and commits last.
- Doctor can reach readers and inspectors, never the applier.

## Test-first work

Write an observable failing test, run it red, implement the smallest change, run it green, then run the relevant layer and full suite. Tests use Node’s built-in runner.

```bash
node --test tests/unit/*.test.js
node --test tests/contract/*.test.js
node --test tests/integration/*.test.js
node --test tests/e2e/*.test.js
```

Contract tests spawn `bin/easyskillz.js`. Integration tests use disposable workspaces. Package tests audit, pack, install in a clean fixture, and invoke the installed executable. CI covers Windows, macOS, and Linux on Node 22 and 24.

## Non-negotiable invariants

- Read-only operations preserve source bytes.
- Every mutation has a deterministic preview and `--dry-run` path.
- Unowned, drifted, shared, or unmanifested output is preserved and diagnosed.
- Instruction management requires an explicit adopted mapping.
- No support surface is called verified without dated host/version activation evidence.
- Do not publish, tag, push, or deploy as part of ordinary development verification.
