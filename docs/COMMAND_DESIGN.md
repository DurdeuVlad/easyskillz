# Command Design Philosophy

## Core Principles

### 1. Domain-Based Organization
Commands are grouped by domain for better organization and discoverability:
- `skill` - Manage skills (add, remove, activate, deactivate, list)
- `tool` - Manage AI tools (register, unregister, list)
- `project` - Project-level operations (sync, export)
- `docs` - Manage instruction files (sync, list, add, remove)

**Format:** `easyskillz <domain> <action> [args] [flags]`

### 2. One-Shot Execution for AI Agents
All interactive prompts must have corresponding flags. AIs should be able to execute any command in a single call without multiple executions.

**Key Rule:** If ANY flag is provided, the command enters **one-shot mode** where:
- All required flags must be provided (no defaults, no prompts)
- Missing flags result in clear error messages
- No interactive prompts are shown

**Example:**
```bash
# ✅ Correct - all flags provided
easyskillz project sync --docs=yes --docs-strategy=unified --gitignore=full

# ❌ Error - missing required flags
easyskillz project sync --docs=yes
# Error: --docs=yes requires --docs-strategy=<unified|tool-specific>

# ❌ Error - partial flags
easyskillz project sync --gitignore=full
# Error: --docs=<yes|no> is required when using flags
```

### 3. Interactive by Default, Flags for Automation
- **No flags:** Prompt humans interactively (if TTY)
- **Any flag:** One-shot mode, all flags required
- **Non-TTY, no flags:** Use safe defaults

This serves both human and AI use cases without ambiguity.

### 4. AI Detection and Warnings
Detect AI agents via environment variables and show helpful warnings when they try to use interactive mode:

```
⚠️  AI AGENT DETECTED (Windsurf)

This command requires user input and cannot run interactively.

If you are an AI agent:
  1. Close this terminal
  2. Ask the user what they want to do
  3. Use the non-interactive version:

     easyskillz project sync --docs=<yes|no> --docs-strategy=<unified|tool-specific> --gitignore=<full|conflict-only|none>

Do not get stuck in interactive prompts.
```

**Detected AI agents:**
- Windsurf: `WINDSURF_CASCADE_TERMINAL`
- Claude Code: `CLAUDECODE`
- Cursor: `CURSOR_AGENT`
- And more (see `src/utils/detectAI.js`)

### 5. Destructive Operations Require Explicit Confirmation
- **Safe operations** (list, deactivate, activate): No confirmation needed
- **Destructive operations** (remove, unregister): Require `--confirm` flag for AIs
- Humans get interactive confirmation prompts

### 6. Consistent Flag Naming
- **Boolean flags:** `--docs=<yes|no>`
- **Choice flags:** `--mode=<full|revert>`, `--strategy=<unified|tool-specific>`
- **Confirmation:** `--confirm` (no value, presence = confirmed)
- **Output:** `--json` for machine-readable output

### 7. Clear Error Messages
- Tell users exactly what went wrong
- Show correct usage examples
- For AIs: show the exact command with all required flags

## Command Structure

```
easyskillz <domain> <action> [args] [flags]
```

### Domains and Actions

**skill:**
- `add <name>` - Create a new skill
- `remove <name> [--confirm]` - Permanently delete a skill
- `deactivate <name>` - Deactivate a skill (soft delete)
- `activate <name>` - Activate a deactivated skill
- `list` - List all skills

**tool:**
- `register <name>` - Add a tool to the project
- `unregister <name> [--mode=<full|revert>] [--confirm]` - Remove a tool
- `list` - List registered tools

**project:**
- `sync [--docs=<yes|no>] [--docs-strategy=<unified|tool-specific>] [--gitignore=<full|conflict-only|none>]` - Detect tools, wire skills, setup project
- `export --target <path>` - Copy skills to another project

**docs:**
- `sync` - Centralize instruction files
- `list` - List managed instruction files

### Global Flags
- `--json` - Machine-readable JSON output
- `--confirm` - Skip confirmation prompts (for destructive operations)

## Examples

### AI-Friendly (One-Shot)
```bash
# Project sync with all flags
easyskillz project sync --docs=yes --docs-strategy=unified --gitignore=full

# Decline everything
easyskillz project sync --docs=no --gitignore=none

# Remove skill
easyskillz skill remove my-skill --confirm

# Unregister tool
easyskillz tool unregister cursor --mode=full --confirm
```

### Human-Friendly (Interactive)
```bash
# Project sync - prompts for each choice
easyskillz project sync
# Prompts: Manage docs? [Y/n]
# Prompts: Strategy? [1/2]
# Prompts: Gitignore? [1/2/3]

# Remove skill - prompts for confirmation
easyskillz skill remove my-skill
# Prompts: Are you sure? [y/N]
```

## Why This Design?

1. **Scalability** - Easy to add new domains and actions
2. **Discoverability** - `easyskillz skill --help` shows all skill commands
3. **AI-First** - One command does everything, no multi-step flows
4. **Human-Friendly** - Interactive prompts when flags omitted
5. **Consistency** - Same pattern across all commands
6. **Future-Proof** - Can add new flags without breaking existing usage
7. **No Ambiguity** - One-shot mode is explicit (any flag = all flags required)

## Implementation Notes

### One-Shot Mode Detection
```javascript
const hasAnyFlag = docsFlag !== undefined || 
                   docsStrategyFlag !== undefined || 
                   gitignoreFlag !== undefined;

if (hasAnyFlag) {
  // One-shot mode - all flags required, no prompts, no defaults
  if (docsFlag === undefined) {
    throw new Error('--docs=<yes|no> is required when using flags');
  }
  // ... validate all required flags
} else if (isTTY) {
  // Interactive mode - prompt user
  if (isAIAgent()) {
    showAIWarning();
    process.exit(1);
  }
  // ... show prompts
} else {
  // Non-TTY, no flags - use safe defaults
}
```

### AI Detection
```javascript
const { isAIAgent, showAIWarning } = require('./utils/detectAI');

if (isAIAgent()) {
  showAIWarning('command name', 'example command with flags');
  process.exit(1);
}
```

## Migration from Old Commands

Old flat commands are completely replaced:
- `easyskillz sync` → `easyskillz project sync`
- `easyskillz add` → `easyskillz skill add`
- `easyskillz list` → `easyskillz skill list`
- `easyskillz register` → `easyskillz tool register`

No backward compatibility needed (pre-release).
