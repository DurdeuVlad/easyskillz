# Autonomous Operation Guide

## Core Principle

**This skill NEVER asks the user for input.** It detects, analyzes, and reports autonomously.

## Auto-Detection Strategy

Use piped commands to check all scenarios in one execution:

```bash
git diff --cached || git diff || git diff HEAD~1..HEAD
```

This checks:
1. **Staged changes** first (most likely for pre-commit review)
2. **Unstaged changes** if nothing staged (work in progress)
3. **Last commit** if no uncommitted changes (post-commit review)

The first non-empty result is what gets audited.

## What Gets Checked

**Always all 5 principles:**
- P1: Centralise
- P2: Never Force the User
- P3: Sync is the Entry Point
- P4: Respect User Decisions
- P5: Automation

No user confirmation. No "which principles should I check?" questions.

## Command Execution

When the AI agent invokes this skill:

1. **Detect scope** → Run piped git diff command
2. **Parse changes** → Extract file:line modifications
3. **Analyze** → Check all 5 principles
4. **Report** → Output structured violations

All in one seamless flow. Zero interruptions.

## Exit Behavior

- **Exit 0**: All principles pass
- **Exit non-zero**: Violations found (count = number of failed principles)

## JSON Output Support

For machine-readable results:
```bash
audit-northstar --json
```

Returns:
```json
{
  "scope": "staged|unstaged|commit",
  "principles": {
    "P1": {"status": "PASS|FAIL", "violations": [...]},
    "P2": {"status": "PASS|FAIL", "violations": [...]},
    "P3": {"status": "PASS|FAIL", "violations": [...]},
    "P4": {"status": "PASS|FAIL", "violations": [...]},
    "P5": {"status": "PASS|FAIL", "violations": [...]}
  },
  "summary": {
    "passed": 5,
    "failed": 0,
    "total_violations": 0
  }
}
```

## AI Agent Instructions

When you (the AI agent) invoke this skill:

1. **Do NOT ask** "What should I audit?"
2. **Do NOT ask** "Which principles should I check?"
3. **Do NOT ask** "Should I run this command?"

Just execute the skill. It handles everything internally.

## Example Flow

**User says**: "Audit my changes"

**AI agent does**:
```
1. Invoke audit-northstar skill
2. Skill auto-detects scope (staged → unstaged → last commit)
3. Skill analyzes all 5 principles
4. Skill outputs report
5. AI agent presents report to user
```

**Total user prompts**: 0
**Total confirmations**: 0
**Total questions**: 0

This is P5 (Automation) in action.
