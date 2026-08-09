<!-- easyskillz-managed -->
## Easyskillz 0.5.0

Canonical skills live in `.easyskillz/skills/<name>/`. Use the CLI; do not edit generated agent targets.

```bash
easyskillz skill validate
easyskillz project sync --dry-run
easyskillz project doctor
```

Mutation is preview-first. Instruction files are managed only through an explicitly adopted source-to-target mapping:

```bash
easyskillz docs adopt docs/AGENTS.source.md --target AGENTS.md --dry-run
easyskillz docs sync --dry-run
```

Apply only after reviewing the plan. Easyskillz never treats missing state as deletion authority.
<!-- /easyskillz-managed -->
