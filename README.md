<div align="center">

# 🧠 easyskillz

[![npm version](https://img.shields.io/npm/v/easyskillz?style=flat)](https://www.npmjs.com/package/easyskillz)
[![license](https://img.shields.io/github/license/DurdeuVlad/easyskillz?style=flat)](LICENSE)
[![last commit](https://img.shields.io/github/last-commit/DurdeuVlad/easyskillz?style=flat)](https://github.com/DurdeuVlad/easyskillz/commits/main)

**Simple, easy to use and brings order to AI agent chaos.**

*One folder. All your tools. Zero repetition.*

</div>

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

```bash
npm install -g easyskillz
```

---

## Three Commands

```bash
easyskillz sync               # detect tools, wire everything, set up .easyskillz/
easyskillz add <name>         # create a skill and wire it to all your tools instantly
easyskillz register <tool>    # add a tool and wire all existing skills to it
```

That's the whole API.

---

## What `sync` Looks Like

```
$ easyskillz sync

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
| `CLAUDE.md`, `AGENTS.md`, `.cursorrules`, etc. | ✗ no | personal tool config, differs per developer |

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

---

## Supported Tools

| Tool | Skills Path | Instruction File |
|------|-------------|-----------------|
| Claude Code | `.claude/skills/` | `CLAUDE.md` |
| Codex | `.codex/skills/` | `AGENTS.md` |
| Cursor | `.cursor/skills/` | `AGENTS.md` |
| Windsurf | `.windsurf/skills/` | `AGENTS.md` |
| Windsurf Workflows | `.windsurf/workflows/` | `AGENTS.md` |
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

No silent failures. No copies getting out of sync on machines that support symlinks.

---

## Config

`.easyskillz/easyskillz.json` is committed to git. It's how teammates know what to wire.

```json
{
  "tools": ["claude", "cursor"],
  "linkStrategy": "symlink"
}
```

Symlinks themselves are gitignored — they're machine-local.

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

`sync` creates a `_easyskillz` meta-skill and appends one line to each registered tool's instruction file:

```
When creating a new skill, run: `easyskillz add <name>`
```

Your AI agents will use the CLI to create skills from now on. The loop closes.

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

- **Configurable instruction file paths** — right now `sync` appends the easyskillz line to root files like `CLAUDE.md` and `AGENTS.md`. A future release will let you control where that line goes, or skip it entirely, per tool. [Discussion welcome.](https://github.com/DurdeuVlad/easyskillz/issues)
- **`easyskillz remove <name>`** — unwire and delete a skill from all tools
- **`easyskillz list`** — show all skills and their wiring status per tool
- **`easyskillz status`** — quick health check, flags anything broken or unwired

---

<div align="center">

MIT License · [Contributing](CONTRIBUTING.md) · [Development](DEVELOPMENT.md) · [Issues](https://github.com/DurdeuVlad/easyskillz/issues)

</div>
