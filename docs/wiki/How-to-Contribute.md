# How to contribute — 0.5.1

Use Node.js 22+ and install from the lockfile:

```bash
npm ci
npm test
```

## Change loop

1. State the observable CLI or artifact contract.
2. Write a real failing test and run it red.
3. Implement inside the declared file boundary.
4. Run the focused test green, then its test layer and the full suite.
5. Update executable examples and compatibility evidence.

Tests should prefer the public binary. Assert stdout, stderr, exit code, JSON shape, full-tree byte stability, and recovery—not private call counts.

## Surface changes

Document the host’s native path, instruction contract, discovery behavior, evidence date, and limitations. Emit the complete native directory without rewriting its contents. Keep the tier `conformant` until dated activation evidence names the host version.

## Safety review

- Does validation finish before planning?
- Does planning finish before any write?
- Is the destination contained after resolving parent links?
- Is every replacement staged and recoverable?
- Is state written last?
- Is deletion backed by ownership, zero consumers, and matching identity?
- Are docs handled only through explicit adoption?

The CLI-only public API and three 0.5.x aliases are defined in the command schema. Do not add an undocumented shortcut.
