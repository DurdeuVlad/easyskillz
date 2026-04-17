# OOP Architecture

## Overview

easyskillz uses Object-Oriented Programming patterns to centralize common command functionality and eliminate code duplication.

## Base Command Class

All commands inherit from `BaseCommand` which provides:

### Core Features

1. **AI Detection** - Automatic detection before any interactive prompt
2. **Flag Parsing** - Centralized flag handling
3. **One-Shot Mode** - Automatic detection when flags are provided
4. **Interactive Mode** - Safe prompting with AI detection
5. **Error Handling** - Consistent error messages and JSON output

### Class Structure

```javascript
class BaseCommand {
  constructor({ cwd, flags, isTTY, json })
  
  // Mode detection
  hasFlags()                    // Check if in one-shot mode
  
  // Flag validation
  validateOneShotFlags(required, commandName)
  
  // Interactive prompting (with AI detection)
  async prompt(question, commandName)
  async getFlagOrPrompt(flagName, question, commandName, defaultValue)
  async confirm(message, commandName, requireConfirmFlag)
  
  // Output helpers
  jsonOutput(data)
  error(message, code)
  
  // To be implemented by subclasses
  async execute()
}
```

## Command Implementation Pattern

### 1. Create Command Class

```javascript
const BaseCommand = require('../core/BaseCommand');

class MyCommand extends BaseCommand {
  constructor(arg1, arg2, cwd, options) {
    super(options); // Pass { cwd, flags, isTTY, json }
    this.arg1 = arg1;
    this.arg2 = arg2;
  }

  async execute() {
    // Command logic here
    
    // Get flag or prompt user (with AI detection)
    const value = await this.getFlagOrPrompt(
      'my-flag',                    // Flag name
      'Enter value: ',              // Question if no flag
      'my command',                 // Command name for AI warning
      'default'                     // Default if non-TTY
    );
    
    // Confirm action (with AI detection)
    const confirmed = await this.confirm(
      'Are you sure? [y/N]: ',      // Confirmation message
      'my command',                 // Command name for AI warning
      true                          // Require --confirm flag for AI
    );
    
    // Output
    if (this.json) {
      this.jsonOutput({ ok: true, result: 'success' });
    } else {
      this.out('✓ Done!');
    }
  }
}
```

### 2. Create Wrapper Function

```javascript
// Wrapper for backward compatibility
async function myCommand(arg1, arg2, cwd, opts = {}) {
  const cmd = new MyCommand(arg1, arg2, cwd, opts);
  await cmd.execute();
}

module.exports = myCommand;
```

## Benefits

### 1. **Centralized AI Detection**
- No need to manually check `isAIAgent()` in every command
- Automatic warnings with correct command name
- Consistent behavior across all commands

### 2. **Automatic One-Shot Mode**
- `hasFlags()` detects when any flag is provided
- Automatic validation of required flags
- No silent defaults in one-shot mode

### 3. **Safe Interactive Prompts**
- `prompt()` always checks for AI before prompting
- `getFlagOrPrompt()` handles flag-or-prompt logic
- `confirm()` handles confirmation with --confirm flag

### 4. **Consistent Error Handling**
- `error()` provides JSON or text output
- Automatic exit codes
- Clear error messages

### 5. **Code Reusability**
- Common patterns extracted to base class
- Less code duplication
- Easier to maintain

## Example: Remove Command

### Before (Procedural)

```javascript
async function remove(skillName, cwd, opts = {}) {
  const { json, confirm } = opts;
  const out = json ? () => {} : console.log;
  
  // Check if skill exists
  if (!fs.existsSync(skillPath)) {
    if (json) {
      console.log(JSON.stringify({ ok: false, error: 'Not found' }));
    } else {
      out('Error: Skill not found');
    }
    process.exit(1);
  }
  
  // AI detection
  if (!confirm && isAIAgent()) {
    showAIWarning('skill remove');
    process.exit(1);
  }
  
  // Prompt for confirmation
  if (!confirm) {
    const rl = readline.createInterface({ ... });
    const answer = await ask(rl, 'Are you sure? [y/N]: ');
    rl.close();
    if (answer !== 'y') {
      out('Cancelled.');
      return;
    }
  }
  
  // Delete skill
  fs.rmSync(skillPath, { recursive: true });
  
  // Output
  if (json) {
    console.log(JSON.stringify({ ok: true }));
  } else {
    out('✓ Removed');
  }
}
```

### After (OOP)

```javascript
class RemoveCommand extends BaseCommand {
  constructor(skillName, cwd, options) {
    super(options);
    this.skillName = skillName;
  }

  async execute() {
    // Check if skill exists
    if (!fs.existsSync(skillPath)) {
      this.error('Skill not found');
    }
    
    // Confirm (AI detection automatic)
    const confirmed = await this.confirm(
      'Are you sure? [y/N]: ',
      'skill remove',
      true
    );
    
    if (!confirmed) {
      this.out('Cancelled.');
      return;
    }
    
    // Delete skill
    fs.rmSync(skillPath, { recursive: true });
    
    // Output
    if (this.json) {
      this.jsonOutput({ ok: true });
    } else {
      this.out('✓ Removed');
    }
  }
}
```

**Benefits:**
- 30% less code
- AI detection automatic
- No manual flag checking
- Consistent error handling
- Easier to read and maintain

## Migration Plan

### Phase 1: Create Base Class ✅
- [x] Create `BaseCommand` class
- [x] Add AI detection methods
- [x] Add flag handling methods
- [x] Add prompt methods

### Phase 2: Refactor Commands
- [ ] Refactor `remove` command
- [ ] Refactor `unregister` command
- [ ] Refactor `sync` command
- [ ] Refactor `add` command
- [ ] Refactor `register` command

### Phase 3: Test & Validate
- [ ] Test all refactored commands
- [ ] Verify AI detection works
- [ ] Verify one-shot mode works
- [ ] Verify interactive mode works

### Phase 4: Cleanup
- [ ] Remove old command files
- [ ] Update documentation
- [ ] Update tests

## Best Practices

### 1. Always Call super()
```javascript
constructor(arg, cwd, options) {
  super(options); // MUST be first
  this.arg = arg;
}
```

### 2. Use Command Name Consistently
```javascript
await this.confirm('Sure?', 'skill remove', true);
//                           ^^^^^^^^^^^^^ Same as in COMMAND_GUIDANCE
```

### 3. Handle Both JSON and Text Output
```javascript
if (this.json) {
  this.jsonOutput({ ok: true, data });
} else {
  this.out('✓ Success');
}
```

### 4. Use error() for Errors
```javascript
// Good
this.error('Skill not found');

// Bad
console.error('Error: Skill not found');
process.exit(1);
```

### 5. Let Base Class Handle AI Detection
```javascript
// Good
await this.confirm('Sure?', 'my command', true);

// Bad
if (isAIAgent()) {
  showAIWarning('my command');
  process.exit(1);
}
```

## Testing

Commands can be tested by mocking the base class methods:

```javascript
const MyCommand = require('./myCommand');

test('should execute successfully', async () => {
  const cmd = new MyCommand('arg', '/path', {
    cwd: '/path',
    flags: { confirm: true },
    isTTY: false,
    json: true,
  });
  
  await cmd.execute();
  // Assert results
});
```

## Future Enhancements

1. **Validation Decorators** - Add @validate decorators for flag validation
2. **Command Registry** - Auto-register commands for help system
3. **Middleware** - Add before/after hooks for logging, metrics
4. **Async Validation** - Validate flags against external sources
5. **Command Composition** - Compose complex commands from simple ones
