# Changelog

All notable changes to easyskillz are documented here.

Format: `## [version] — YYYY-MM-DD` · sections: `Added`, `Fixed`, `Changed`, `Breaking`

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
