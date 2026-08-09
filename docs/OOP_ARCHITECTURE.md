# Runtime architecture — 0.5.1

The old command-class pipeline has been replaced by explicit data boundaries. The design is intentionally boring: validate, plan, apply, then commit state.

```text
argv
  → CLI schema and parser
  → normalized invocation
  → config, skill, registry, detector, and ownership readers
  → immutable plan
  → preview or one confirmation
  → transactional apply
  → ownership state committed last
```

## Responsibilities

- CLI modules own grammar, aliases, help, output envelopes, streams, and exit codes.
- Readers return values or stable diagnostics. They do not repair or normalize user files as a side effect.
- The planner resolves physical targets, deduplicates shared consumers, computes hashes, and rejects collisions.
- Filesystem primitives contain paths inside the workspace, stage sibling outputs, and replace atomically.
- Materializers deliver complete native directories. Shared consumers deduplicate to one `.agents/skills` artifact; Claude Code uses `.claude/skills`.
- Local state records generator version, source/output identity, actual materialization, and consumers.
- Cleanup is planned only when ownership and current identity match.
- Doctor uses readers and inspectors but has no path to apply.

## Desired versus actual state

`.easyskillz/easyskillz.json` schema 2 is committed desired state. `.easyskillz/state.json` is ignored, machine-local actual state. Missing actual state permits diagnosis and non-destructive adoption; it never grants deletion authority.

## Failure model

Validation and collisions fail before writes. Applied migrations and owned-doc operations keep backups. State is written last, so an interrupted operation cannot claim an incomplete output. A rerun or doctor reports recoverable staging and drift deterministically.

Node.js 22+ is required. The executable is the CLI-only public API; internal module classes and functions are not compatibility surfaces.
