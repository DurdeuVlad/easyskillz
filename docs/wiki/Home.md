# Easyskillz developer wiki

Easyskillz 0.5.0 is a preview-first skill distribution CLI for Node.js 22+.

- [Understand the codebase](Understanding-the-Codebase.md)
- [Contribute safely](How-to-Contribute.md)
- [Public command contract](../COMMAND_DESIGN.md)
- [Runtime architecture](../OOP_ARCHITECTURE.md)
- [Agent compatibility evidence](../research/agent-compatibility-gap.md)

The executable is the CLI-only public API. Canonical skill directories are committed; generated targets and local ownership state are rebuilt per machine. Instruction files are touched only after explicit adoption.

Start with:

```bash
easyskillz project doctor
easyskillz skill validate
easyskillz project sync --dry-run
```

The deprecated aliases exist through 0.5.x but do not belong in new examples.
