# Changelog

All notable changes to easyskillz are documented here.

Format: `## [version] — YYYY-MM-DD` · sections: `Added`, `Fixed`, `Changed`, `Breaking`

---

## [0.2.0] — 2026-04-16

### Added
- **Centralized instruction file management** — easyskillz now centralizes instruction files (`CLAUDE.md`, `AGENTS.md`, etc.) in `.easyskillz/docs/` and creates symlinks at expected locations
- **Two strategies**: Choose between `unified` (one INSTRUCTION.md per folder for all tools) or `tool-specific` (separate file per tool)
- **Auto-detection** — `easyskillz sync` automatically scans entire repo for instruction files and centralizes them
- **All-in or all-out** — Single opt-in decision during first sync, then fully automated
- `easyskillz docs sync` — force re-scan and centralize any new instruction files
- `easyskillz docs list` — show centralized instruction files
- `easyskillz export --target <path>` — copy skills + config to another project and auto-sync
- `manageDocs` config field — boolean flag for all-in docs management
- `docsStrategy` config field — `unified` or `tool-specific` strategy choice
- North Star Principles in CONTRIBUTING.md — design philosophy for all features
- `audit-northstar` skill — autonomous North Star principle compliance checking (dev-only)

### Changed
- `easyskillz sync` prompts for docs management on first run
- Instruction files are now symlinks (gitignored) pointing to centralized sources in `.easyskillz/docs/` (committed)
- Meta-skill (`_easyskillz`) always updated on sync to keep documentation current
- Meta-skill content expanded with all v0.2.0 commands
- Hierarchical instruction files supported (e.g., `/CLAUDE.md`, `/src/CLAUDE.md`, `/src/api/CLAUDE.md`)

### Breaking
- `wirer.appendInstruction` deprecated (kept for backward compatibility)
- `docsFolders` config removed — replaced with `manageDocs` + `docsStrategy`
- `easyskillz docs add/remove` commands removed — auto-detection handles everything

---

## [0.1.2] — 2026-04-15

### Fixed
- Detection false-positives: Codex, Cursor, and Windsurf all share `AGENTS.md` — detectors now use tool-specific auto-created artifacts (`detectionMarker` field) instead of the shared instruction file
- `CLAUDE.md` and `GEMINI.md` replaced as detection markers with `.claude/settings.json` and `.gemini/settings.json` (auto-created by the tools, not user-created)
- Windsurf workflows wired as flat `.md` files instead of directories (correct format for `/slash` commands)
- Cursor and Windsurf `instructionFile` corrected to `AGENTS.md` (native cross-tool standard)

### Added
- `windsurf-workflows` as a separate registry entry — Windsurf Skills (auto-invoked by Cascade) and Windsurf Workflows (manual `/slash` commands) are now distinct tools
- `detectionMarker` field in registry — decouples detection logic from instruction file path

---

## [0.1.1] — 2026-04-15

### Fixed
- `easyskillz --help` and `easyskillz -h` exited with code 1 instead of showing usage

---

## [0.1.0] — 2026-04-15

Initial release.

### Added
- `easyskillz sync` — detect tools, probe symlink support, wire all skills, write config
- `easyskillz add <name>` — create a skill and wire it to all registered tools instantly
- `easyskillz register <tool>` — add a tool and wire all existing skills to it
- Symlink strategy with automatic junction fallback on Windows (no admin required)
- Stub fallback when symlinks are unavailable (`.md` pointer files)
- `_easyskillz` meta-skill auto-wired on sync so agents know to use the CLI
- Glass-box UX: plan printed before execution, single Y/n confirmation
- `--json` flag for machine-readable output on all commands
- TTY detection — no interactive prompts in CI/pipe environments
- Fully idempotent — safe to re-run at any time
- Supported tools: Claude Code, Codex, Cursor, Windsurf, GitHub Copilot, Gemini CLI
