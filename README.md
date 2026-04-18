<div align="center">

# 🧠 easyskillz

[![npm version](https://img.shields.io/npm/v/easyskillz?style=flat)](https://www.npmjs.com/package/easyskillz)
[![license](https://img.shields.io/github/license/DurdeuVlad/easyskillz?style=flat)](LICENSE)
[![last commit](https://img.shields.io/github/last-commit/DurdeuVlad/easyskillz?style=flat)](https://github.com/DurdeuVlad/easyskillz/commits/main)

**Simple, easy to use and brings order to AI agent chaos.**

*One folder. All your tools. Zero repetition.*

</div>

> **For AI Assistants**: Read [INSTALL-SKILL.md](INSTALL-SKILL.md) for installation instructions.

---

## The Problem

You use Claude Code. And Cursor. Maybe Windsurf. Each one has its own skills folder, its own config, its own path. You build a great `review-pr` skill — and now you maintain it in three places.

Your teammate clones the repo. Nothing works.

---

## The Solution

```
.easyskillz/skills/     ← one folder, committed to git
    review-pr/
        SKILL.md
    commit-msg/
        SKILL.md
```

Run `easyskillz sync` once. Every tool gets a symlink. Every teammate who clones runs `easyskillz sync` and everything is wired in seconds.

---

## Install

**Latest stable:**
```bash
npm install -g easyskillz
```

**Alpha (v2.0.0 - domain-based commands, OOP architecture):**
```bash
npm install -g easyskillz@alpha
```

---

## Commands

> **v2.0.0-alpha.3**: Commands now use domain-based structure: `easyskillz <domain> <action>`

### Skill Management
```bash
easyskillz skill add <name>           # create a skill and wire it to all tools
easyskillz skill list                 # show all skills (active + deactivated)
easyskillz skill deactivate <name>    # soft delete (reversible)
easyskillz skill activate <name>      # restore a deactivated skill
easyskillz skill remove <name>        # permanently delete (requires --confirm for AI)
```

### Tool Management
```bash
easyskillz tool register <name>       # add a tool and wire all skills to it
easyskillz tool unregister <name>     # remove a tool (requires --mode and --confirm for AI)
easyskillz tool list                  # show registered tools
```

### Project Operations
```bash
easyskillz project sync               # detect tools, wire everything, set up .easyskillz/
easyskillz project export --target <path>  # copy skills + config to another project
```

### Instruction Files
```bash
easyskillz docs sync                  # update instruction files for all tracked folders
easyskillz docs list                  # show instruction files and their status
```

### AI-Friendly (One-Shot Execution)
```bash
# All flags in one command - no interactive prompts
easyskillz project sync --docs=yes --docs-strategy=unified --gitignore=full
easyskillz skill remove my-skill --confirm
easyskillz tool unregister cursor --mode=full --confirm
```

---

## What `project sync` Looks Like

```
$ easyskillz project sync

Scanning for AI tools...
  ✓ Claude Code      (.claude/skills)
  ✓ Cursor           (.cursor/skills)
  ✗ Codex            (not found)

Reading config (.easyskillz/easyskillz.json)...
  Registered: claude, cursor
  Strategy:   symlink

Testing symlink support...
  ✓ symlinks work

Scanning for unwired skills...
  review-pr    → Claude Code: ✗ missing
  review-pr    → Cursor:      ✗ missing
  commit-msg   → Claude Code: ✗ missing

Plan:
  [ wire ]      .claude/skills/review-pr   →  .easyskillz/skills/review-pr
  [ wire ]      .cursor/skills/review-pr   →  .easyskillz/skills/review-pr
  [ wire ]      .claude/skills/commit-msg  →  .easyskillz/skills/commit-msg

Proceed? [Y/n]

  ✓ Wired review-pr  → Claude Code
  ✓ Wired review-pr  → Cursor
  ✓ Wired commit-msg → Claude Code

Done. 2 tool(s) wired via symlink.
```

You see exactly what will happen before it happens. One confirmation. Done.

---

## Built for Teams

easyskillz is designed to minimize git surface area and eliminate developer friction in large teams.

**What gets committed — and what doesn't:**

| Path | Committed | Why |
|------|-----------|-----|
| `.easyskillz/skills/` | ✓ yes | shared source of truth for all skills |
| `.easyskillz/easyskillz.json` | ✓ yes | shared tool list so teammates wire the same tools |
| `.claude/skills/`, `.cursor/skills/`, etc. | ✗ no | machine-local symlinks, meaningless to others |
| `CLAUDE.md`, `AGENTS.md`, `.cursor/rules`, etc. | ✗ no | personal tool config, differs per developer |

Each developer uses whichever AI tools they prefer. Their local config, symlinks, and instruction files never touch git. Only the skills themselves — the shared knowledge — are committed.

```bash
# Day 1 — you set it up
easyskillz sync
easyskillz add review-pr
easyskillz add commit-msg

git add .easyskillz/skills/
git commit -m "add shared skills"
git push
```

```bash
# Teammate clones — uses Cursor, you use Claude, no conflict
git clone <repo>
easyskillz sync   ← detects their tools, wires all skills automatically

✓ Done. 2 tool(s) wired via symlink.
```

No merge conflicts on tool config. No PRs blocked because someone uses a different editor. The skill content is the only thing that matters — and that's exactly what gets shared.

## Automated Behaviors

easyskillz is designed to "just work." It handles several complex AI tool behaviors automatically:

- **Windsurf Dual-Wiring**: Windsurf uses both directories (for Cascade) and flat files (for Slash commands). Registration wires skills to both `.windsurf/skills/` and `.windsurf/workflows/` automatically.
- **Skill Auto-Repair**: Gemini CLI requires specific YAML frontmatter in `SKILL.md`. easyskillz detects missing metadata and auto-injects it during `sync` to ensure your skills are always discoverable by all AI agents.
- **Surgical Gitignore**: When using the `smart` strategy (recommended), easyskillz surgically ignores only the files it manages (like symlinks and settings). Your custom tool files (hooks, scripts, logs) stay tracked by git.
- **Robust Detection**: Tools are detected via multiple markers — whether it's a config file, an instruction file, or just the root folder, easyskillz will find it.
- **Normalization**: Tool IDs are case-insensitive. `easyskillz tool register CurSor` works exactly like `cursor`.

---

## Supported Tools

| Tool | Skills Path | Instruction File |
|------|-------------|-----------------|
| Claude Code | `.claude/skills/` | `CLAUDE.md` |
| Codex | `.codex/skills/` | `AGENTS.md` |
| Cursor | `.cursor/skills/` | `AGENTS.md` |
| Windsurf | `.windsurf/skills/` & `.windsurf/workflows/` | `AGENTS.md` |
| GitHub Copilot | `.github/skills/` | `.github/copilot-instructions.md` |
| Gemini CLI | `.gemini/skills/` | `GEMINI.md` |

---

## How Wiring Works

easyskillz probes symlink support on your machine automatically. 

```
SYMLINKS AVAILABLE   ████████████████  →  uses symlinks (always in sync)
SYMLINKS UNAVAILABLE ████████████████  →  creates stub .md files pointing to source
```

**Symlink** — a `.claude/skills/review-pr` directory that IS `.easyskillz/skills/review-pr`. Edit once, all tools see it instantly.

**Stub** — a `.claude/skills/review-pr/SKILL.md` file that says:
```
Read the actual skill from: .easyskillz/skills/review-pr/SKILL.md
```

**Workflow (Windsurf)** — a flat `.windsurf/workflows/review-pr.md` file that mirrors the content of your skill.

No silent failures. No copies getting out of sync.

---

## Gitignore Strategies

Manage your project's `.gitignore` block automatically:

- **smart** (recommended) — Surgical ignore. Only ignores managed skills/configs, keeps your custom files tracked.
- **full** — Blanket ignore root tool folders. Cleanest repo, but may hide custom files in tool dirs.
- **minimal** — Only ignore files that might cause merge conflicts.
- **none** — Manual management.

easyskillz uses a managed block (`# easyskillz-start` ... `# easyskillz-end`) so it can update its rules as you add more tools.

---

## Config

`.easyskillz/easyskillz.json` is committed to git. It's how teammates know what to wire.

```json
{
  "tools": ["claude", "cursor"],
  "linkStrategy": "symlink",
  "manageDocs": true,
  "docsStrategy": "unified"
}
```

**Instruction file management** (optional):
- `manageDocs: true` — easyskillz centralizes instruction files in `.easyskillz/docs/` and creates symlinks
- `docsStrategy: "unified"` — one `INSTRUCTION.md` per folder for all tools
- `docsStrategy: "tool-specific"` — separate file per tool per folder

Symlinks themselves are gitignored — they're machine-local. Centralized docs in `.easyskillz/docs/` are committed.

---

## Agent-Friendly

All commands support `--json` for machine-readable output:

```bash
$ easyskillz sync --json
{"ok":true,"tools":["claude","cursor"],"strategy":"symlink","actions":["wire","wire","instruct"]}
```

- No interactive prompts when stdin is not a TTY
- Exit code `0` on success, non-zero on failure
- Errors to stderr, output to stdout
- Safe to re-run — fully idempotent

---

## Self-Propagating

`sync` creates a `_easyskillz` meta-skill that teaches AI agents how to use easyskillz.

**Optional**: Enable instruction file management during first sync:
- Automatically scans entire repo for `CLAUDE.md`, `AGENTS.md`, etc.
- Centralizes them in `.easyskillz/docs/`
- Replaces with symlinks (gitignored)
- Choose `unified` (one source for all tools) or `tool-specific` (separate per tool)
- Fully automated after initial choice

Your AI agents will use the CLI to create skills and manage instruction files. The loop closes.

---

## Contributing

Adding a new tool is a one-PR contribution:

1. Add an entry to [`src/registry.js`](src/registry.js)
2. Add a detector file to [`src/detectors/`](src/detectors/)

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full template.

---

## Collaboration Rules

**Branching**
- Branch from `main`
- Name: `feat/<tool-name>`, `fix/<description>`, `docs/<description>`

**Pull Requests**
- One PR = one change. Adding a tool = one detector file + one registry entry, nothing more
- PR title describes the change, not the task: `Add Cline detector` not `Working on new tool support`
- All PRs require a passing smoke test: `node bin/easyskillz.js sync` in a temp project with your tool present

**Commits**
- Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`
- One logical change per commit

**Code Style**
- Plain CommonJS, zero runtime dependencies — keep it that way
- Every operation must be idempotent
- Every action must be visible to the user before it happens (glass box)
- If it touches the filesystem, it needs an existence check first

**What We Won't Merge**
- Runtime dependencies (`chalk`, `commander`, `inquirer`, etc.)
- Non-idempotent operations
- Silent side effects
- More than 3 questions to the user in any command

---

## Why Not Just Use Symlinks Manually?

You could. But then:

- No shared config for teammates
- No auto-detection of tools
- No idempotent re-wire on clone
- No instruction file updates
- No stub fallback for restricted environments
- No `easyskillz add` to wire new skills everywhere at once

easyskillz is the missing glue.

---

## Roadmap

- **`easyskillz remove <name>`** — unwire and delete a skill from all tools
- **`easyskillz list`** — show all skills and their wiring status per tool
- **`easyskillz status`** — quick health check, flags anything broken or unwired
- **Skill templates** — `easyskillz add <name> --template <type>` for common patterns

---

<div align="center">

MIT License · [Contributing](CONTRIBUTING.md) · [Development](DEVELOPMENT.md) · [Issues](https://github.com/DurdeuVlad/easyskillz/issues)

</div>
