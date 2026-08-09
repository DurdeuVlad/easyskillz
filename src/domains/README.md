# Domain boundary

The `skill`, `tool`, `project`, and `docs` modules are the application boundary behind the declared CLI grammar. They accept normalized arguments and return structured results; they do not parse `argv`, print, prompt, or terminate the process.

Mutating operations return the same immutable action plan for preview and apply. The dispatcher owns confirmation policy, while the output layer owns human/JSON rendering, stream selection, and exit codes.
