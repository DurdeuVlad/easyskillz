# easyskillz Testing

## Test Structure

### 1. Unit Tests (`tests/*.test.js`)
- Isolated tests for core logic (registry, config, wirer).
- Fast, no side effects outside temporary folders.
- Run via: `npm test`

### 2. E2E Scenarios (`tests/e2e/scenarios.test.js`)
- Realistic user flows using the actual CLI binary.
- Each test creates an isolated git repository and mocks tool installations.
- Run via: `node --test tests/e2e/scenarios.test.js`

---

## E2E Scenario Catalog

| Scenario | Title | Action | Expected Result |
|----------|-------|--------|-----------------|
| 1 | The Fresh Clone | `sync` | Symlinks created for all local tools; instruction files updated; managed gitignore block added. |
| 2 | The Tool Hopper | `register windsurf` | Tool added to config; dual-wired to both `skills/` (folders) and `workflows/` (flat files). |
| 3 | Surgical Gitignore | `sync --gitignore=smart` | Only managed folders/configs ignored; user hooks/scripts in tool dirs remain tracked. |
| 4 | Smart Switch | `sync --gitignore=full` | Switches from blanket folder ignore to surgical ignore automatically if user files detected in tool dir. |
| 5 | Auto-Repair | `sync` | Malformed `SKILL.md` (no YAML) auto-injected with required Gemini CLI frontmatter. |
| 6 | Clean Break | `unregister --mode=full` | Tool removed from config; tool-specific skills directory deleted; gitignore block cleaned. |
| 7 | Reversible Break | `unregister --mode=revert` | Tool removed from config/gitignore, but local folder stays intact. |
| 8 | Docs Migrator | `sync --docs=yes` | Scattered `CLAUDE.md`, `AGENTS.md` centralized in `.easyskillz/docs/` and replaced by symlinks. |
| 9 | Nested Docs | `sync --strategy=tool-specific` | Instruction files in subdirectories (e.g. `src/CLAUDE.md`) centralized and linked. |
| 10 | Case-Insensitivity | `register CuRsoR` | Tool name normalized to lowercase in config and lookup; no errors. |
| 11 | GitHub Protector | `register copilot` | `.github/skills/` ignored, but `.github/workflows/` root remains tracked. |
| 12 | Manual Meddler | `sync` | Manual user edits or corruption inside the `# easyskillz` gitignore block are overwritten with correct rules. |
| 13 | The Minimalist | `sync --gitignore=minimal` | Only conflict-prone config files ignored; skills directories remain tracked. |
| 14 & 15 | Deactivate/Activate | `skill deactivate` / `activate` | Skill renamed/moved to `.disabled`; wiring removed from tools; restored instantly on reactivate. |
| 16 | Empty State Sync | `sync` | No tools detected; sets up empty `.easyskillz/` structure without crashing. |
| 17 | The Exporter | `project export` | Skills and config copied to another project path; target project auto-synced. |
| 18 | Robust Detection | `sync` | Tool detected even if only the root folder exists (no config/settings file yet). |
| 19 | Codex Explicit | `sync` | Specialized detection for Codex tool markers and `AGENTS.md` wiring. |
| 20 | AI Friendliness | `sync --json` | JSON output contains clean success/tool/wired objects for automation. |
| 21 | Idempotency | `sync` x2 | Second run detects everything already wired; no changes made; no errors thrown. |

---

## Adding Tests

### New Scenario
1. Open `tests/e2e/scenarios.test.js`.
2. Use helpers from `helpers.js` (`setupRepo`, `mockTool`, `runEZ`).
3. Assert file existence or content using `node:assert`.

### Helpers
- `setupRepo()`: Initialize a fresh project in a temp dir.
- `mockTool(path, id)`: Simulate an AI tool presence.
- `runEZ(args, path, env)`: Execute the CLI binary.
