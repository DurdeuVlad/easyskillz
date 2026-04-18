# easyskillz Testing

## Test Structure

### 1. Unit Tests (`tests/*.test.js`)
- Isolated tests for core logic (registry, config, wirer).
- Fast, no side effects outside temporary folders.
- Run via: `npm test`

### 2. E2E Scenarios (`tests/e2e/`)
- Realistic user flows using the actual CLI binary.
- Each test creates an isolated git repository and mocks tool installations.
- Covers: Smart gitignore switching, Windsurf dual-wiring, Gemini auto-repair, and project sync.
- Run via: `node --test tests/e2e/scenarios.test.js`

## Adding Tests

### New Scenario
1. Open `tests/e2e/scenarios.test.js`.
2. Use helpers from `helpers.js` (`setupRepo`, `mockTool`, `runEZ`).
3. Assert file existence or content using `node:assert`.

### Helpers
- `setupRepo()`: Initialize a fresh project in a temp dir.
- `mockTool(path, id)`: Simulate an AI tool presence.
- `runEZ(args, path)`: Execute the CLI.
