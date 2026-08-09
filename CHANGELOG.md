# Changelog

## 0.5.1 — 2026-08-09

- Fixed Node.js 22 nested-test completion in the host detector contract.
- Restored CI coverage for the repository's `master` branch.
- Made npm publish dry-runs execute the installed-package gate instead of inheriting nested dry-run state.

## 0.5.0 — 2026-08-09

Requires Node.js 22+.

### Added

- Declared domain CLI with deterministic help, validation, JSON envelopes, exits, aliases, preview, and confirmation boundaries.
- Strict schema-2 config and byte-preserving YAML document validation.
- Complete native skill-directory materialization, deterministic hashes, local ownership state, shared consumers, containment, staging, and atomic replacement.
- Explicit `project migrate`, `docs adopt`, `docs sync`, and `docs restore` preview/apply workflows with backups and rollback.
- Expanded doctor diagnostics and three-OS Node 22/24 verification contracts.

### Changed

- `project sync` handles skills and generated targets only; instruction ownership is separate and explicit.
- Source skills are never silently rewritten. Format and repair are named preview-first commands.
- Codex, Copilot, Gemini CLI, Antigravity, Cursor, and Devin share native `.agents/skills`; Claude Code uses native `.claude/skills` registration.
- Obsolete Cursor MDC and Devin Desktop workflow transforms are removed from the active product contract.
- Support labels begin at `conformant`; `verified` requires dated activation evidence for a named host version.

### Compatibility

- `sync`, `doctor`, and `add <name>` remain deprecated aliases through 0.5.x and will not be removed before 0.6.0.
- The 2.0.0-alpha.3 line is a historical prerelease experiment, not the current version or install path.

## 0.3.0 — 2026-05-08

Added the first native-path corrections and compatibility doctor. Its implicit repair, broad ignore, and instruction-centralization behavior is superseded by 0.5.0.

## 0.2.0 — 2026-04-18

Added early multi-tool wiring and centralized instruction experiments. Retained here for release history only.

## 0.1.0 — 2026-04-15

Initial release.
