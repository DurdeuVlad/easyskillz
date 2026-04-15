# Research: Tool Configuration Paths

**Date:** 2026-04-15
**Scope:** Cursor and Windsurf — instruction files, skills, workflows, and what is/isn't deprecated.

---

## Cursor

### Instruction file

| File | Status | Notes |
|------|--------|-------|
| `.cursorrules` | **Deprecated** | Still works for completions but **ignored by Agent mode** |
| `.cursor/rules/*.mdc` | Current (directory) | Cannot append a single line — each file is a full rule with YAML frontmatter |
| `AGENTS.md` | Supported flat file | Plain markdown, project root, no frontmatter — best option for a single appended line |

**Conclusion for easyskillz:** Use `AGENTS.md` as Cursor's `instructionFile`. It's flat, writable, and supported.

### Skills vs Commands

| Concept | Directory | Trigger | Format |
|---------|-----------|---------|--------|
| Skills | `.cursor/skills/` or `.agents/skills/` | Automatic (agent decides) or manual | Folder + `SKILL.md` |
| Commands | `.cursor/commands/` | Manual via `/command-name` | Single `.md` file |

**Skills** = knowledge/procedures the agent picks up automatically.
**Commands** = slash-command shortcuts the user invokes manually.

**Conclusion for easyskillz:** `skillsDir` stays `.cursor/skills/`. Commands are a separate concept — out of scope for v1 but worth a future `commandsDir` field.

---

## Windsurf

### Instruction file

| File | Status | Notes |
|------|--------|-------|
| `.windsurfrules` | **Deprecated** | Legacy single file, still works but not recommended |
| `.windsurf/rules/*.md` | Current (directory) | Cannot append a single line — each file is a rule with frontmatter + activation mode |
| `~/.codeium/windsurf/memories/global_rules.md` | Global flat file | User-level only, not project-level — wrong scope for easyskillz |
| `AGENTS.md` | Supported flat file | Project root, plain markdown — best option for a single appended line |

**Conclusion for easyskillz:** Use `AGENTS.md` as Windsurf's `instructionFile` (same as Cursor). It's flat, writable, project-level, and supported by both tools.

### Skills vs Workflows

| Concept | Directory | Trigger | Format |
|---------|-----------|---------|--------|
| Skills | `.windsurf/skills/<name>/` | Automatic (Cascade decides) or `@skill-name` | Folder + `SKILL.md` + optional supporting files |
| Workflows | `.windsurf/workflows/` | Manual only via `/workflow-name` | Single `.md` file |

**Skills** = Cascade automatically evaluates and invokes based on context. Only name+description loaded initially; full content lazy-loaded on invocation.
**Workflows** = slash commands. Cascade **never** invokes these automatically. User-triggered only.

Docs quote:
> "If Cascade should pick it up automatically and it needs supporting files, use a Skill. If you always want to trigger it yourself, use a Workflow."

**Conclusion for easyskillz:**
- `skillsDir` stays `.windsurf/skills/` ✓
- Need to add `workflowsDir: '.windsurf/workflows'` to the Windsurf registry entry
- Workflows are single `.md` files (not folders), so wiring strategy differs from skills

---

## Impact on registry.js

### Implemented state

```js
cursor: {
  skillsDir:       '.cursor/skills',
  instructionFile: 'AGENTS.md',   // flat, writable, cross-tool standard
},
windsurf: {
  skillsDir:       '.windsurf/skills',
  instructionFile: 'AGENTS.md',
},
'windsurf-workflows': {
  id:              'windsurf-workflows',
  skillsDir:       '.windsurf/workflows',
  instructionFile: 'AGENTS.md',
  type:            'workflows',   // wirer uses flat .md files, not skill folders
},
```

Codex, Cursor, Windsurf, and Windsurf Workflows all share `AGENTS.md`. `appendInstruction` is idempotent — the line is written once regardless of how many tools list the same file.

Workflows use `type: 'workflows'` — `wireSkill` symlinks `SKILL.md` directly as `skill-name.md` (flat file) instead of symlinking the directory.

### Deferred to v2
- Cursor `.cursor/commands/` — `commandsDir` field for slash commands

---

## Sources

- [Windsurf Skills docs](https://docs.windsurf.com/windsurf/cascade/skills)
- [Windsurf Workflows docs](https://docs.windsurf.com/windsurf/cascade/workflows)
- [Windsurf Memories docs](https://docs.windsurf.com/windsurf/cascade/memories)
- [Cursor Skills docs](https://cursor.com/docs/skills)
- [Cursor Rules docs](https://cursor.com/docs/context/rules)
- [.cursorrules deprecated - DEV Community](https://dev.to/nedcodes/cursor-agent-mode-ignores-cursorrules-use-mdc-instead-5flb)
- [Builder.io - Skills vs Rules vs Commands](https://www.builder.io/blog/agent-skills-rules-commands)
- [Cursor forum - Skills vs Commands](https://forum.cursor.com/t/skills-vs-commands-vs-rules/148875)
