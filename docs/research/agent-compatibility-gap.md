# Agent compatibility contracts — 0.5.0

Evidence reviewed: 2026-08-08. Native paths come from current vendor documentation; artifact behavior remains `conformant` until exercised against a named host build.

| Surface | Project skill target | Instruction target | Emission | Tier |
|---|---|---|---|---|
| `codex` | `.agents/skills/<name>/` | `AGENTS.md` | complete native directory | conformant |
| `claude` | `.claude/skills/<name>/` | `CLAUDE.md` | complete native directory | conformant |
| `copilot` | `.agents/skills/<name>/` | `.github/copilot-instructions.md` | complete native directory | conformant |
| `gemini-cli` | `.agents/skills/<name>/` | `GEMINI.md` | complete native directory | conformant |
| `antigravity` | `.agents/skills/<name>/` | `AGENTS.md` / `GEMINI.md` | complete native directory | conformant |
| `cursor` | `.agents/skills/<name>/` | `AGENTS.md` | complete native directory | conformant |
| `devin` | `.agents/skills/<name>/` | `AGENTS.md` | complete native directory | conformant |

## Conclusions

- A skill target must contain the real `SKILL.md` and its resources. Textual indirection is not a portable delivery contract.
- Claude documents directory symlinks. Other hosts require artifact-level verification, so `auto` must report actual link/copy behavior and fall back observably.
- Codex, Copilot, Gemini CLI, Antigravity, Cursor, and Devin share `.agents/skills`. Ownership therefore belongs to the physical artifact and consumer set, not one tool ID.
- Claude Code uses its native `.claude/skills` project directory.
- Retired Cursor-rule and Windsurf-era outputs are migration evidence only. They are preserved and diagnosed unless an explicit, backed-up migration proves they are managed.
- Instruction-file support varies by host and surface. Easyskillz manages it only through an explicit adopted mapping.

## Support labels

`conformant` means documentation plus generated-artifact checks pass. `verified` requires a dated activation record naming the host version and the exact artifact tested. No 0.5.0 surface is promoted without that evidence.

## Primary sources

- OpenAI Codex skills: https://developers.openai.com/codex/skills
- OpenAI AGENTS.md: https://developers.openai.com/codex/guides/agents-md
- Anthropic Claude Code skills: https://code.claude.com/docs/en/skills
- Anthropic CLAUDE.md: https://code.claude.com/docs/en/memory
- GitHub Copilot skills: https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills
- GitHub Copilot instructions: https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions
- Gemini CLI skills: https://geminicli.com/docs/cli/skills/
- Gemini CLI context: https://geminicli.com/docs/cli/gemini-md/
- Google Antigravity Skills: https://antigravity.google/docs/skills
- Cursor Agent Skills: https://docs.cursor.com/context/skills
- Devin skills: https://docs.devin.ai/product-guides/creating-skills

Recheck vendor contracts before changing a surface tier or target.
