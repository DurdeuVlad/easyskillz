# easyskillz

Skills in this project are managed by easyskillz.

## Commands

### Skills
`easyskillz add <name>`        — create a new skill and wire it to all registered tools
`easyskillz sync`              — detect tools, wire skills, update instruction files
`easyskillz register <tool>`   — add a tool and wire all existing skills to it

### Instruction files
`easyskillz docs sync`              — update instruction files for all tracked folders
`easyskillz docs list`              — show instruction files and their status
`easyskillz docs add <folder>`      — start tracking a subfolder
`easyskillz docs remove <folder>`   — stop tracking a subfolder

### Transfer
`easyskillz export --target <path>` — copy skills + config to another project and sync it

After cloning this repo on a new machine, run:
`easyskillz sync`
