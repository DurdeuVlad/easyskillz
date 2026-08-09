# easyskillz

Easyskillz 0.5.1 keeps reusable agent skills honest across tools. You author one complete skill directory under `.easyskillz/skills/`; Easyskillz validates it, plans target changes, and materializes the complete native directory each host discovers.

Requires Node.js 22+.

## What changed in 0.5

- Complete native directory delivery by link or atomic copy. Scripts, references, assets, and the real `SKILL.md` move together.
- Strict YAML and schema-2 config validation. Read-only commands never rewrite source bytes.
- Preview-first mutations with `--dry-run`, local ownership state, hashes, shared-consumer tracking, and safe cleanup.
- Explicit docs ownership. `project sync` does not scan or rewrite instruction files.
- One declared CLI grammar with stable JSON envelopes, usage exits, and help that cannot dispatch.

The executable is the CLI-only public API. Requiring internal JavaScript modules is unsupported.

## Install

```bash
npm install --global easyskillz@0.5.1
easyskillz --version
```

## Start

```bash
# inspect first
easyskillz project doctor
easyskillz skill validate
easyskillz project sync --dry-run

# apply the reviewed project plan
easyskillz project sync --confirm
```

Canonical sources are committed. Generated outputs and machine-local `.easyskillz/state.json` are not.

```text
.easyskillz/
  easyskillz.json       committed desired state, schema 2
  skills/<name>/        committed canonical skill directories
  state.json            ignored local ownership and artifact identity
```

## Commands

```text
easyskillz skill add <name>
easyskillz skill remove <name>
easyskillz skill activate <name>
easyskillz skill deactivate <name>
easyskillz skill list
easyskillz skill validate [name]
easyskillz skill format <name> [--write]
easyskillz skill repair <name> [--write]

easyskillz tool register <surface>
easyskillz tool unregister <surface>
easyskillz tool list

easyskillz project sync
easyskillz project doctor [--strict]
easyskillz project export --target <path>
easyskillz project migrate [--write]

easyskillz docs adopt <source> --target <instruction-path> [--write]
easyskillz docs sync [--write]
easyskillz docs restore <backup-id> --write
easyskillz docs list
```

Options may appear before or after operands. `--` ends option parsing. `--json` produces one object on stdout; usage failures exit 2, operational failures exit 1.

Every mutating command accepts `--dry-run`. Format, repair, migration, and docs operations preview by default and use `--write` to apply. Other mutations require one interactive confirmation or an explicit non-interactive apply flag.

Export targets are existing directories inside the current workspace. Absolute paths, `..`, and parent-link escapes are rejected by the same containment policy as every other write.

## Compatibility aliases

The human aliases `sync`, `doctor`, and `add <name>` are deprecated but remain available through 0.5.x. Removal is no earlier than 0.6.0. JSON and help calls do not emit alias warnings.

```bash
easyskillz sync --help
easyskillz doctor --help
easyskillz add --help
```

New documentation and automation should use canonical domain commands.

## Agent surfaces

Documentation conformance is not runtime verification. Every surface starts at `conformant`; promotion to `verified` requires dated activation evidence naming the host version.

| Surface | Project skill target | Instruction target | Output | Tier |
|---|---|---|---|---|
| `codex` | `.agents/skills/<name>/` | `AGENTS.md` | complete native directory | conformant |
| `claude` | `.claude/skills/<name>/` | `CLAUDE.md` | complete native directory | conformant |
| `copilot` | `.agents/skills/<name>/` | `.github/copilot-instructions.md` | complete native directory | conformant |
| `gemini-cli` | `.agents/skills/<name>/` | `GEMINI.md` | complete native directory | conformant |
| `antigravity` | `.agents/skills/<name>/` | `AGENTS.md` / `GEMINI.md` | complete native directory | conformant |
| `cursor` | `.agents/skills/<name>/` | `AGENTS.md` | complete native directory | conformant |
| `devin` | `.agents/skills/<name>/` | `AGENTS.md` | complete native directory | conformant |

Codex, Copilot, Gemini CLI, Antigravity, Cursor, and Devin share one physical `.agents/skills` output. Claude Code uses its native `.claude/skills` directory. Easyskillz records the full consumer set so removing one surface cannot remove an artifact still used by another.

## Skill documents

Portable frontmatter uses `name` and `description`; supported extension keys are preserved. Validation reports malformed YAML, unsafe constructs, type problems, name mismatches, and target-specific loss without editing the source.

```bash
easyskillz skill validate review-pr
easyskillz skill format review-pr       # preview diff
easyskillz skill format review-pr --write
easyskillz skill repair review-pr        # preview repair
```

Applied format and repair operations keep a recoverable original.

## Explicit docs ownership

Instruction files remain user-owned until you adopt an exact mapping:

```bash
easyskillz docs adopt docs/AGENTS.source.md --target AGENTS.md
easyskillz docs adopt docs/AGENTS.source.md --target AGENTS.md --write
easyskillz docs sync
easyskillz docs sync --write
```

Adoption refuses targets with unmarked user content or another owner. Originals are backed up, and `docs restore <backup-id> --write` restores a recorded version.

## Migration

Legacy unversioned config is read as schema 1 without mutation. Migration is explicit:

```bash
easyskillz project migrate
easyskillz project migrate --write
```

The preview covers legacy IDs, generated artifacts, instruction ownership, and unsafe ignore rules. Unsupported legacy host intent is diagnosed instead of being silently mapped to another product, and legacy outputs remain untouched until an explicit reviewed migration. Apply backs up recoverable originals and rolls back source/config/instruction changes if the declared migration cannot finish.

## Safety model

- All paths are contained inside the workspace after resolving existing parent links.
- Generated writes stage beside their destination and replace atomically where supported.
- Ownership state commits last.
- Links are removed only when their identity matches recorded state.
- Copies are removed only when their current hash matches recorded output.
- Missing or invalid state never grants deletion authority.
- Shared outputs are one physical artifact with a consumer set.
- `--force` is not an ownership bypass.

## Contributing

Use Node.js 22+ and run the public contract before proposing changes:

```bash
npm ci
npm test
```

See [CONTRIBUTING.md](CONTRIBUTING.md), [DEVELOPMENT.md](DEVELOPMENT.md), and the [developer wiki](docs/wiki/Home.md).

MIT License.
