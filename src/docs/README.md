# Instruction ownership

Instruction files are managed only through explicit `docs adopt`, `docs sync`, and `docs restore` operations. Ordinary project or skill sync never rewrites `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, or another host instruction file.

Adoption records an exact source-to-target mapping and inserts a bounded managed block. Sync updates only that block. Restore uses the ownership record and backup; content outside the managed block remains user-owned. Conflicts and drift are diagnostics, never permission to overwrite.
