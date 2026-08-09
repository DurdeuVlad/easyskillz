# Contributing to Easyskillz

Easyskillz 0.5.0 targets Node.js 22+. Install exactly what the lockfile declares:

```bash
npm ci
npm test
```

## Start with the public contract

The CLI-only public API is `easyskillz <domain> <action>`. Add or change grammar in the declared command schema, then cover exact stdout, stderr, JSON, exit codes, aliases, help, and no-write behavior through the executable.

## Core rules

1. Write the failing test first and preserve real red/green evidence.
2. Keep canonical skills byte-for-byte unchanged in read-only paths.
3. Route all writes through validate → plan → apply → state.
4. Treat `.easyskillz/easyskillz.json` as committed desired state and `.easyskillz/state.json` as ignored local ownership state.
5. Never delete without proven ownership, zero consumers, and matching current identity.
6. Never make instruction files an implicit `project sync` side effect.
7. Preserve unknown vendor frontmatter and every resource in native delivery.
8. Keep support claims at `conformant` until a dated activation record names the host version.

## Adding or changing a surface

- Update the registry contract and normalized detector evidence.
- Identify and cite the native directory discovered by the host.
- Add documentation provenance and artifact tests.
- Cover shared targets, collisions, drift, cleanup, and platform-specific link behavior.
- Do not equate a shared directory name with a separate product identity.

## Pull requests

- One coherent change with tests and updated documentation.
- Conventional commit subjects are welcome but not required by the runtime.
- Run unit, contract, integration, E2E, audit, package, and coverage gates relevant to the change.
- Do not commit local state, backup payloads, staging directories, tarballs, or credentials.
- Publishing and distribution-tag changes require separate maintainer authorization.

The deprecated `sync`, `doctor`, and `add` aliases exist through 0.5.x only. New examples must use canonical commands; removal is no earlier than 0.6.0.
