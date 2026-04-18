# Installing easyskillz — For AI Assistants

This guide is for AI coding assistants installing easyskillz in a user's repository.

## Installation Commands

Run these commands in order:

```bash
npm install -g easyskillz
```

```bash
easyskillz sync
```

Done. Installation complete.

## PowerShell Terminal Rules (Windsurf on Windows)

**Use backslashes for paths**:
```powershell
cd .easyskillz\skills
```

**Use PowerShell cmdlets, not Unix commands**:
```powershell
Get-ChildItem .easyskillz\skills
Get-Content file.json
```

**Chain commands with semicolons**:
```powershell
npm install -g easyskillz; easyskillz sync
```

**Never use**: `&&`, `ls`, `cat`, `grep` - these don't work in PowerShell.

## Autonomous Operation (No User Interaction)

When running commands autonomously, use **command piping** to provide answers:

**Accept docs management with unified strategy**:
```bash
echo "Y\n1" | easyskillz sync
```

**Accept docs management with tool-specific strategy**:
```bash
echo "Y\n2" | easyskillz sync
```

**Decline docs management**:
```bash
echo "n" | easyskillz sync
```

**PowerShell syntax** (Windows):
```powershell
"Y`n1" | easyskillz sync
```

**Get JSON output** (machine-readable):
```bash
easyskillz sync --json
easyskillz docs list --json
```

## Other Commands

**Add a new skill**:
```bash
easyskillz add <skill-name>
```

**Register a new tool**:
```bash
easyskillz register <tool-name>
```

**Force re-scan instruction files**:
```bash
easyskillz docs sync
```

**Show centralized instruction files**:
```bash
easyskillz docs list
```

## Critical Rules

- Never manually copy skills between directories
- Never edit `.easyskillz/easyskillz.json` manually
- `sync` is idempotent - safe to run multiple times
- Use piping for autonomous operation - never wait for user input
- CLI auto-skips prompts when not in a TTY (but piping is more reliable)
