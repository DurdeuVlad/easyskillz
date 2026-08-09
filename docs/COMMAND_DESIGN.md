# Command design — 0.5.1

Easyskillz 0.5.1 uses one declared grammar before dispatch:

```text
easyskillz [--help|-h] [--version] [--json]
easyskillz <domain> <action> [operands...] [options...]
```

Options may precede or follow operands. `--` ends option parsing. Root, domain, action, and option arity are validated before a command can read or write project state.

## Domains

| Domain | Actions |
|---|---|
| `skill` | `add`, `remove`, `activate`, `deactivate`, `list`, `validate`, `format`, `repair` |
| `tool` | `register`, `unregister`, `list` |
| `project` | `sync`, `doctor`, `export`, `migrate` |
| `docs` | `adopt`, `sync`, `restore`, `list` |

Only `sync`, `doctor`, and `add <name>` are aliases. They remain deprecated through 0.5.x and are removed no earlier than 0.6.0.

`project export --target <path>` accepts an existing workspace-contained directory. It stages and atomically replaces that directory's `.easyskillz` export; absolute and parent-traversal destinations fail with `E_PATH_ESCAPE`.

## Streams and exits

| Result | Human mode | JSON mode | Exit |
|---|---|---|---|
| success | result on stdout | one success object on stdout | 0 |
| help/version | stdout only | one success object | 0 |
| usage failure | diagnostic and usage hint on stderr | one error object on stdout | 2 |
| operational failure | diagnostic on stderr | one error object on stdout | 1 |

```json
{"ok":true,"command":"project.sync","result":{}}
```

```json
{"ok":false,"command":"project.sync","error":{"code":"E_USAGE_UNKNOWN_OPTION","message":"..."}}
```

JSON stderr is empty. A dispatched human alias emits one warning on stderr; JSON and terminal help/version emit none.

## Mutation boundary

Every mutation supports `--dry-run`. Parsing, validation, detection, and planning are identical between preview and an unchanged apply. Interactive application presents one complete plan and one confirmation. Non-interactive execution never infers consent.

Format, repair, migration, and document operations preview by default and use `--write`. Help and validation failures perform zero filesystem writes.
