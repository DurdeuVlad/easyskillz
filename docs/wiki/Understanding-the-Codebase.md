# Understanding the codebase — 0.5.0

Easyskillz runs on Node.js 22+ and exposes a CLI-only public API.

```text
bin/easyskillz.js
  └─ src/cli/                 grammar, parsing, dispatch, output
      └─ domains              normalized command operations
          ├─ config/          schema-2 and legacy schema-1 readers
          ├─ skill-document/  byte-preserving YAML interpretation
          ├─ registry + detectors
          ├─ operations/      deterministic plans and transactional apply
          ├─ outputs/         complete native materialization
          ├─ docs/            explicit source-to-target ownership
          ├─ fs/              containment, hashes, staging, replacement
          └─ state            local artifact identity and consumers
```

## Data flow

1. Parse and validate the entire invocation.
2. Read desired config, canonical skills, host evidence, and local state.
3. Build an immutable physical-artifact plan; deduplicate shared consumers and reject collisions.
4. Return the preview or request one confirmation.
5. Apply staged writes and validated cleanup.
6. Commit local ownership state last.

Doctor stops after inspection. Migration and document ownership add backup/restore behavior around the same apply boundary.

## Storage

- `.easyskillz/skills/<name>/`: committed, complete canonical source.
- `.easyskillz/easyskillz.json`: committed schema-2 desired state.
- `.easyskillz/state.json`: ignored actual state; never reconstructed as deletion authority.
- Native targets: links or full copies.
- Shared native targets: one deterministic artifact with a complete consumer set.

The legacy `sync`, `doctor`, and `add` aliases are parser concerns only. Runtime components receive canonical command identities.
