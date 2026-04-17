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
 * Shows a warning message when AI agent is detected in interactive mode.
 * 
 * @param {string} command - The command that requires interaction
 * @param {string} nonInteractiveExample - Example of non-interactive usage
 */
function showAIWarning(command, nonInteractiveExample) {
  const agentName = getAgentName();
  
  console.error('');
  console.error('⚠️  AI AGENT DETECTED' + (agentName ? ` (${agentName})` : ''));
  console.error('');
  console.error('This command requires user input and cannot run interactively.');
  console.error('');
  console.error('If you are an AI agent:');
  console.error('  1. Close this terminal');
  console.error('  2. Ask the user what they want to do');
  console.error('  3. Use the non-interactive version:');
  console.error('');
  console.error(`     ${nonInteractiveExample}`);
  console.error('');
  console.error('Do not get stuck in interactive prompts.');
  console.error('');
}

module.exports = {
  isAIAgent,
  getAgentName,
  showAIWarning,
};
