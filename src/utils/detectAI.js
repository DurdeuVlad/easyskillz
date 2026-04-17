'use strict';

const fs = require('fs');

/**
 * Detects if the current process is being run by an AI agent.
 * 
 * Detection methods:
 * 1. Universal standards: AGENT, AI_AGENT
 * 2. Tool-specific environment variables
 * 3. Non-TTY stdin (piped/scripted execution)
 * 4. File-based detection (Devin)
 * 
 * @returns {boolean} True if AI agent detected
 */
function isAIAgent() {
  // Check universal standards (emerging)
  if (process.env.AGENT || process.env.AI_AGENT) {
    return true;
  }
  
  // Check tool-specific environment variables
  const aiEnvVars = [
    'CLAUDECODE',                  // Claude Code
    'CURSOR_AGENT',                // Cursor
    'GEMINI_CLI',                  // Gemini CLI
    'CODEX_SANDBOX',               // Codex
    'AUGMENT_AGENT',               // Augment
    'CLINE_ACTIVE',                // Cline
    'OPENCODE_CLIENT',             // OpenCode
    'TRAE_AI_SHELL_ID',            // TRAE AI
    'WINDSURF_CASCADE_TERMINAL',   // Windsurf (verified)
  ];
  
  if (aiEnvVars.some(v => process.env[v])) {
    return true;
  }
  
  // Check if stdin is not a TTY (running in pipe/script)
  // Note: This can have false positives (e.g., cron jobs, CI/CD)
  // but is useful as a fallback
  if (!process.stdin.isTTY) {
    return true;
  }
  
  // Check for Devin (file-based detection)
  try {
    if (fs.existsSync('/opt/.devin')) {
      return true;
    }
  } catch (e) {
    // Ignore filesystem errors
  }
  
  return false;
}

/**
 * Gets the name of the detected AI agent, if any.
 * 
 * @returns {string|null} Agent name or null if not detected
 */
function getAgentName() {
  // Universal standards
  if (process.env.AGENT) return process.env.AGENT;
  if (process.env.AI_AGENT) return process.env.AI_AGENT;
  
  // Tool-specific detection
  if (process.env.CLAUDECODE) return 'Claude Code';
  if (process.env.CURSOR_AGENT) return 'Cursor';
  if (process.env.GEMINI_CLI) return 'Gemini CLI';
  if (process.env.CODEX_SANDBOX) return 'Codex';
  if (process.env.AUGMENT_AGENT) return 'Augment';
  if (process.env.CLINE_ACTIVE) return 'Cline';
  if (process.env.OPENCODE_CLIENT) return 'OpenCode';
  if (process.env.TRAE_AI_SHELL_ID) return 'TRAE AI';
  if (process.env.WINDSURF_CASCADE_TERMINAL) return 'Windsurf';
  
  // File-based detection
  try {
    if (fs.existsSync('/opt/.devin')) return 'Devin';
  } catch (e) {
    // Ignore
  }
  
  // Non-TTY fallback
  if (!process.stdin.isTTY) return 'Unknown AI Agent';
  
  return null;
}

/**
 * Command-specific guidance for AI agents
 */
const COMMAND_GUIDANCE = {
  'project sync': {
    example: 'easyskillz project sync --docs=<yes|no> --docs-strategy=<unified|tool-specific> --gitignore=<full|conflict-only|none>',
    flags: {
      '--docs': {
        description: 'Manage instruction files (CLAUDE.md, AGENTS.md, etc.)',
        values: {
          'yes': 'Centralize instruction files in .easyskillz/docs/',
          'no': 'Leave instruction files as-is (manual management)',
        },
        recommended: 'yes',
      },
      '--docs-strategy': {
        description: 'How to organize instruction files (required if --docs=yes)',
        values: {
          'unified': 'One INSTRUCTION.md for all tools (simpler)',
          'tool-specific': 'Separate files per tool (more control)',
        },
        recommended: 'unified',
      },
      '--gitignore': {
        description: 'How to manage .gitignore for tool directories',
        values: {
          'full': 'Gitignore all tool files (recommended - keeps repo clean)',
          'conflict-only': 'Gitignore only config files (allows committing skills)',
          'none': 'Manual .gitignore management',
        },
        recommended: 'full',
      },
    },
    questionsToAsk: [
      'Do you want easyskillz to manage your instruction files (CLAUDE.md, AGENTS.md, etc.)?',
      'If yes: Should instruction files be unified (one file) or tool-specific (separate files)?',
      'How should .gitignore be configured for AI tool directories?',
    ],
    recommendedCommand: 'easyskillz project sync --docs=yes --docs-strategy=unified --gitignore=full',
  },
  'skill remove': {
    example: 'easyskillz skill remove <name> --confirm',
    flags: {
      '--confirm': {
        description: 'Skip confirmation prompt (required for AI agents)',
        values: {
          'present': 'Proceed with deletion without asking',
        },
        recommended: 'present',
      },
    },
    questionsToAsk: [
      'Which skill do you want to permanently delete?',
      'Are you sure you want to delete this skill? (This cannot be undone)',
    ],
    recommendedCommand: 'easyskillz skill remove <name> --confirm',
  },
  'tool unregister': {
    example: 'easyskillz tool unregister <name> --mode=<full|revert> --confirm',
    flags: {
      '--mode': {
        description: 'How to unregister the tool',
        values: {
          'full': 'Remove from config AND delete tool directory',
          'revert': 'Remove from config, keep tool files intact',
        },
        recommended: 'revert',
      },
      '--confirm': {
        description: 'Skip confirmation prompt (required for AI agents)',
        values: {
          'present': 'Proceed without asking',
        },
        recommended: 'present',
      },
    },
    questionsToAsk: [
      'Which tool do you want to unregister?',
      'Should the tool directory be deleted (full) or kept (revert)?',
      'Are you sure you want to unregister this tool?',
    ],
    recommendedCommand: 'easyskillz tool unregister <name> --mode=revert --confirm',
  },
};

/**
 * Shows a warning message when AI agent is detected in interactive mode.
 * 
 * @param {string} command - The command that requires interaction (e.g., 'project sync')
 * @param {string} [legacyExample] - Legacy example (deprecated, use COMMAND_GUIDANCE instead)
 */
function showAIWarning(command, legacyExample) {
  const agentName = getAgentName();
  const guidance = COMMAND_GUIDANCE[command];
  
  console.error('');
  console.error('⚠️  AI AGENT DETECTED' + (agentName ? ` (${agentName})` : ''));
  console.error('');
  console.error('═══════════════════════════════════════════════════════════════');
  console.error('  INTERACTIVE MODE BLOCKED');
  console.error('═══════════════════════════════════════════════════════════════');
  console.error('');
  console.error('This command requires user input and cannot run interactively.');
  console.error('');
  
  if (guidance) {
    console.error('📋 WHAT TO DO:');
    console.error('');
    console.error('1. ASK THE USER these questions:');
    console.error('');
    guidance.questionsToAsk.forEach((q, i) => {
      console.error(`   ${i + 1}. ${q}`);
    });
    console.error('');
    console.error('2. UNDERSTAND the flags:');
    console.error('');
    Object.entries(guidance.flags).forEach(([flag, info]) => {
      console.error(`   ${flag}`);
      console.error(`   ${info.description}`);
      console.error('');
      Object.entries(info.values).forEach(([value, desc]) => {
        const marker = value === info.recommended ? '✓' : ' ';
        console.error(`     [${marker}] ${value}: ${desc}`);
      });
      console.error('');
    });
    console.error('3. RUN the command with flags:');
    console.error('');
    console.error(`   ${guidance.example}`);
    console.error('');
    console.error('💡 RECOMMENDED (for most users):');
    console.error('');
    console.error(`   ${guidance.recommendedCommand}`);
    console.error('');
  } else {
    // Fallback for commands without guidance
    console.error('If you are an AI agent:');
    console.error('  1. Close this terminal');
    console.error('  2. Ask the user what they want to do');
    console.error('  3. Use the non-interactive version:');
    console.error('');
    console.error(`     ${legacyExample || 'See --help for available flags'}`);
    console.error('');
  }
  
  console.error('═══════════════════════════════════════════════════════════════');
  console.error('');
}

module.exports = {
  isAIAgent,
  getAgentName,
  showAIWarning,
};
