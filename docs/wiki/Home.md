# Welcome to the easyskillz Developer Wiki!

This Wiki is the central source of truth for developing, maintaining, and contributing to the `easyskillz` project. 

Our mission is to provide AI agents and human developers with a **single source of truth** for instructions, custom rules, and specialized skills across all major coding tools (Claude, Cursor, Devin, Gemini, Windsurf, etc.), without adding complexity or friction.

---

## 🧭 Navigation Index

Use the links below to navigate the documentation:

*   **[How to Contribute](How-to-Contribute.md)**
    *   *Details*: Setting up your local environment, coding guidelines (zero-dependency rule, idempotency), E2E testing guides, and our pull request checklist.
*   **[Creating Issues](Creating-Issues.md)**
    *   *Details*: How to write actionable bug reports with debug logs and how to request support for new AI coding tools.
*   **[Understanding the Codebase](Understanding-the-Codebase.md)**
    *   *Details*: Code architecture mapping, execution flows (with sequence diagrams), and explaining the inner workings of the detectors and wiring engine.

---

## ⚡ Quick Start for Developers

To run and test the CLI tool locally on your machine:

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/DurdeuVlad/easyskillz.git
    cd easyskillz
    ```
2.  **No Installation Needed**:
    The project has **zero runtime dependencies**. You can run commands immediately using the local script:
    ```bash
    node bin/easyskillz.js --help
    ```
3.  **Run the Test Suite**:
    Verify that all unit and E2E scenarios are passing:
    ```bash
    npm test
    ```
