# easyskillz

Skills in this project are managed by easyskillz.

## Commands

### Skills
`easyskillz add <name>`        — create a new skill and wire it to all registered tools
`easyskillz sync`              — detect tools, wire skills, manage instruction files
`easyskillz register <tool>`   — add a tool and wire all existing skills to it

### Instruction files
`easyskillz docs sync`         — force re-scan and centralize instruction files
`easyskillz docs list`         — show centralized instruction files

### Transfer
`easyskillz export --target <path>` — copy skills + config to another project and sync it

## Autonomous Operation

When running commands autonomously (without user interaction):

**Use command piping for non-interactive execution:**
```bash
echo "Y\n1" | easyskillz sync  # Auto-accept docs management with unified strategy
echo "Y\n2" | easyskillz sync  # Auto-accept docs management with tool-specific strategy
echo "n" | easyskillz sync      # Decline docs management
```

**For JSON output (machine-readable):**
```bash
easyskillz sync --json
easyskillz docs list --json
```

After cloning this repo on a new machine, run:
`easyskillz sync`
