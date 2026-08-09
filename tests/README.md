# Easyskillz test protocol

The suite is split by the public contract it checks:

- `tests/unit/`: pure parsing, validation, plans, native materialization, paths, and target contracts.
- `tests/contract/`: the public CLI’s streams, exits, help, aliases, JSON, and confirmation boundary.
- `tests/integration/`: temporary-workspace lifecycle, migration, docs, ignore, and doctor behavior.
- `tests/e2e/`: packed-package, installed-binary, documentation, and idempotence behavior.

Run the layers independently or together:

```powershell
npm ci
npm run test:unit
npm run test:contract
npm run test:integration
npm run test:e2e
npm run test:coverage
npm run test:acceptance
npm run test:package
npm run ci
```

`test:coverage` uses Node’s native coverage runner and requires 90% lines/functions and 85% branches. `test:acceptance` refuses a suite that lacks a named test for any AC-01 through AC-28. `test:package` runs full and runtime-only audits, checks the `npm pack` allowlist, clean-installs the tarball, and runs installed `help`, `doctor`, `add`, `sync`, and `migrate` smoke commands. It never publishes.

CI runs every gate on Windows, macOS, and Linux with Node 22 and 24. PTY/ConPTY activation remains a platform gate: a host must execute it successfully before it can be called verified; documentation-only surfaces remain conformant.
