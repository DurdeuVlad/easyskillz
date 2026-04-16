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

## Other Commands

**Add a new skill**:
```bash
easyskillz add <skill-name>
```

**Register a new tool**:
```bash
easyskillz register <tool-name>
```

**Get JSON output**:
```bash
easyskillz sync --json
```

## Critical Rules

- Never manually copy skills between directories
- Never edit `.easyskillz/easyskillz.json` manually
- `sync` is idempotent - safe to run multiple times
- CLI auto-skips prompts when not in a TTY (no flags needed)
