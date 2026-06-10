# Creating Issues

To help us resolve bugs and add features quickly without back-and-forth discussions, please follow these guidelines when opening issues on GitHub.

---

## 🔍 Before You Open an Issue

1.  **Check Existing Issues**: Search the open and closed issues on GitHub to see if your problem has already been reported or solved.
2.  **Verify Version**: Ensure you are running the latest version of `easyskillz` (check using `npm view easyskillz version`).
3.  **Run in Debug Mode**: Run your failed command with the `DEBUG=1` environment variable set. This prints full error stack traces instead of user-friendly messages:
    ```bash
    DEBUG=1 easyskillz project sync
    ```

---

## 🐛 Bug Report Template

When filing a bug, please copy and fill out the template below:

```markdown
### Bug Description
A clear and concise description of what the bug is.

### Environment Context
* **OS**: [e.g., Windows 11, macOS Sequoia, Ubuntu 24.04]
* **Node.js Version**: [e.g., 20.11.0, 22.2.0]
* **easyskillz Version**: [e.g., 0.4.0]
* **AI Coding Tool(s) Active**: [e.g., Claude Code, Cursor, Windsurf]

### Steps to Reproduce
1. Run command `...`
2. Configure settings `...`
3. See error output `...`

### Expected Behavior
A description of what you expected to happen.

### Debug Logs (with DEBUG=1)
```text
(Paste your terminal output here, including stack traces if applicable)
```
```

---

## 💡 Feature Request (New AI Tool Integration)

If you want `easyskillz` to support a new AI coding tool, please check its developer documentation first and provide the following details:

```markdown
### AI Tool Name
What is the name of the tool? (e.g., "CodeWhisperer", "Aider")

### Custom Instructions / Skills Directory
Where does the tool look for custom instructions, rules, or skills? 
(e.g., `.coder/instructions/`, `.agents/rules/`)

### Expected File Format
What file formats does it expect? 
(e.g., a flat `.md` file, a directory with multiple `.md` files, a JSON configuration file, or custom frontmatter headers)

### Detection Markers
What files or folders in a project root uniquely identify that this tool is being used in the workspace?
(e.g., `.aider.conf.yml`, `.coder/`)

### Reference Documentation
Links to official documentation or source code showing how the tool loads these rules.
```
