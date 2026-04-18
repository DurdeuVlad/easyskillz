# audit-northstar Skill

## Purpose

This skill audits easyskillz code changes against the five North Star principles defined in CONTRIBUTING.md. It provides structured, per-principle PASS/FAIL verdicts with specific file:line violations and actionable fixes.

## When to Use

- Before merging PRs to ensure design integrity
- When reviewing code changes for principle compliance
- During code review to catch violations early
- When someone asks "does this respect our design philosophy?"

## What It Checks

### P1: Centralise
- Skills live in `.easyskillz/skills/` as source of truth
- Tool-specific directories are outputs only, never inputs
- No logic reads from tool directories

### P2: Never Force the User
- All writes check for existence first
- Managed blocks preserve user content
- Operations are idempotent
- Destructive actions require confirmation

### P3: Sync is the Entry Point
- New features integrate into `easyskillz sync`
- Sync remains the one-command setup
- No mandatory multi-step initialization

### P4: Respect User Decisions
- Managed blocks preserve user content outside markers
- Only easyskillz-created files are deleted
- User edits outside managed blocks are never touched

### P5: Automation
- Commands support `--json` for machine-readable output
- No interactive prompts in non-TTY environments
- Correct exit codes (0 = success)
- Errors to stderr, output to stdout

## Expected Eval Results

Based on the test scenarios:

### Eval 1: Cleanup Diff
- Should catch 3+ violations across P2 and P4
- Tests detection of missing `isManaged()` checks
- Verifies proper handling of user-owned content

### Eval 2: add.js Direct Write
- Clean P1 catch — most obvious violation
- Should PASS P2-P5 (not over-flag)
- Tests precision of violation detection

### Eval 3: Real Repo
- Post-fix diff should be clean
- Expected output: "all 5 PASS"
- Verifies no false positives on correct code

## Usage

**Fully autonomous** — no user input required. The skill will:
1. Auto-detect scope using piped commands: `git diff --cached || git diff || git diff HEAD~1..HEAD`
2. Extract changes from the first non-empty result
3. Analyze all 5 principles automatically
4. Generate structured report with violations and fixes

**Zero prompts. Zero confirmation. Just results.**

## Output Format

```
# North Star Audit Report

## P1: Centralise — [PASS/FAIL]
## P2: Never Force the User — [PASS/FAIL]
## P3: Sync is the Entry Point — [PASS/FAIL]
## P4: Respect User Decisions — [PASS/FAIL]
## P5: Automation — [PASS/FAIL]

---

## Summary
- Principles passed: X/5
- Violations found: N
- Recommended actions: [...]
```

## Status

✅ Skill created
✅ Wired to all tools (claude, cursor, codex)
✅ Tests passing
✅ Ready for 0.2.0 release
