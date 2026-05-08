# Changelog

All notable changes to easyskillz are documented here.

Format: `## [version] — YYYY-MM-DD` · sections: `Added`, `Fixed`, `Changed`, `Breaking`

---

## [0.3.0] — 2026-05-08

### Added
- Native target generation for current agent behavior: Codex uses `.agents/skills/`, Gemini uses `.gemini/skills/`, Cursor uses `.cursor/rules/*.mdc`, and Windsurf generates both `.windsurf/skills/` and `.windsurf/workflows/*.md`.
- `easyskillz project doctor` read-only compatibility report with JSON support.
- E2E scenarios are now part of `npm test`.
- Research report documenting official agent compatibility gaps.

### Changed
- Pointer stubs are no longer generated when symlinks fail; easyskillz copies real generated content instead.
- Instruction file centralization leaves real instruction content at native paths instead of "See:" pointer files.
- Skill auto-repair now requires a useful `description`, not just syntactically valid frontmatter.

### Fixed
- Codex no longer writes unsupported `.codex/skills` outputs.
- Cursor no longer writes unsupported `.cursor/skills` outputs.
- Centralized docs no longer re-ingest pointer stubs or duplicate managed blocks.

## [0.2.0] — 2026-04-18

### Added
- **Skill Auto-Repair** — Automatically injects required Gemini CLI frontmatter into `SKILL.md` if missing.
- **Windsurf Dual Wiring** — Single registration wires both skills and workflows.
- **Surgical Gitignore Management** — Managed block with markers. Surgically ignores only managed items (skills folders and config files) while preserving unmanaged user files (hooks, scripts) even in tool directories. Protects `.github/` root.
- **Smart Gitignore Switching** — Automatically switches from blanket root ignore to surgical ignore if unmanaged files are detected in tool directories.
- **Interactive Prompts** — Choice between `full`, `smart`, `minimal`, and `none` gitignore strategies.
- **Centralized instruction file management** — easyskillz now centralizes instruction files (`CLAUDE.md`, `AGENTS.md`, etc.) in `.easyskillz/docs/` and creates symlinks at expected locations.
- **Two strategies**: Choose between `unified` (one INSTRUCTION.md per folder for all tools) or `tool-specific` (separate file per tool).
- **Auto-detection** — `easyskillz sync` automatically scans entire repo for instruction files and centralizes them.
- **All-in or all-out** — Single opt-in decision during first sync, then fully automated.
- `easyskillz docs sync` — force re-scan and centralize any new instruction files.
- `easyskillz docs list` — show centralized instruction files.
- `easyskillz export --target <path>` — copy skills + config to another project and auto-sync.
- `manageDocs` config field — boolean flag for all-in docs management.
- `docsStrategy` config field — `unified` or `tool-specific` strategy choice.
- North Star Principles in CONTRIBUTING.md — design philosophy for all features.
- `audit-northstar` skill — autonomous North Star principle compliance checking (dev-only).

### Changed
- `easyskillz sync` prompts for docs management on first run.
- Instruction files are now symlinks (gitignored) pointing to centralized sources in `.easyskillz/docs/` (committed).
- Meta-skill (`_easyskillz`) always updated on sync to keep documentation current.
- Meta-skill content expanded with all v0.2.0 commands.
- Hierarchical instruction files supported (e.g., `/CLAUDE.md`, `/src/CLAUDE.md`, `/src/api/CLAUDE.md`).
- Tool IDs normalized to lowercase for registration and lookups.
- Case-insensitive tool registration (`WiNdSuRf` -> `windsurf`).

### Breaking
- `wirer.appendInstruction` deprecated (kept for backward compatibility).
- `docsFolders` config removed — replaced with `manageDocs` + `docsStrategy`.
- `easyskillz docs add/remove` commands removed — auto-detection handles everything.
- `windsurf-workflows` tool merged into `windsurf`.

---

## [0.1.2] — 2026-04-15

### Fixed
- Detection false-positives: Codex, Cursor, and Windsurf all share `AGENTS.md` — detectors now use tool-specific auto-created artifacts (`detectionMarker` field) instead of the shared instruction file.
- `CLAUDE.md` and `GEMINI.md` replaced as detection markers with `.claude/settings.json` and `.gemini/settings.json` (auto-created by the tools, not user-created).
- Windsurf workflows wired as flat `.md` files instead of directories (correct format for `/slash` commands).
- Cursor and Windsurf `instructionFile` corrected to `AGENTS.md` (native cross-tool standard).

### Added
- `windsurf-workflows` as a separate registry entry.
- `detectionMarker` field in registry.

---

## [0.1.1] — 2026-04-15

### Fixed
- `easyskillz --help` and `easyskillz -h` usage output.

---

## [0.1.0] — 2026-04-15

Initial release.
