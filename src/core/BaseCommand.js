'use strict';

const readline = require('readline');
const { isAIAgent, showAIWarning } = require('../utils/detectAI');

/**
 * Base class for all easyskillz commands
 * Handles AI detection, interactive prompts, and flag validation
 */
class BaseCommand {
  constructor({ cwd, flags = {}, isTTY = true, json = false }) {
    this.cwd = cwd;
    this.flags = flags;
    this.isTTY = isTTY;
    this.json = json;
    this.out = json ? () => {} : (s) => process.stdout.write(s + '\n');
  }

  /**
   * Check if any flags are provided (one-shot mode)
   */
  hasFlags() {
    return Object.keys(this.flags).some(key => 
      key !== 'json' && key !== 'help' && this.flags[key] !== undefined
    );
  }

  /**
   * Validate required flags in one-shot mode
   * @param {string[]} requiredFlags - List of required flag names
   * @param {string} commandName - Command name for error messages
   */
  validateOneShotFlags(requiredFlags, commandName) {
    if (!this.hasFlags()) return; // Not in one-shot mode

    const missing = requiredFlags.filter(flag => this.flags[flag] === undefined);
    
    if (missing.length > 0) {
      this.out(`Error: Missing required flags: ${missing.map(f => `--${f}`).join(', ')}`);
      this.out('');
      this.out(`When using flags, all required flags must be provided.`);
      this.out(`Run 'easyskillz ${commandName} --help' for usage information.`);
      process.exit(1);
    }
  }

  /**
   * Prompt user for input (with AI detection)
   * @param {string} question - Question to ask
   * @param {string} commandName - Command name for AI warning
   * @returns {Promise<string>} User's answer
   */
  async prompt(question, commandName) {
    if (!this.isTTY) {
      throw new Error('Cannot prompt in non-TTY mode');
    }

    // Check for AI before prompting
    if (isAIAgent()) {
      showAIWarning(commandName);
      process.exit(1);
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
    });
  }

  /**
   * Get flag value or prompt user (with AI detection)
   * @param {string} flagName - Flag name (without --)
   * @param {string} question - Question to ask if flag not provided
   * @param {string} commandName - Command name for AI warning
   * @param {*} defaultValue - Default value if non-TTY and no flag
   * @returns {Promise<*>} Flag value or user input
   */
  async getFlagOrPrompt(flagName, question, commandName, defaultValue = null) {
    // If flag provided, use it
    if (this.flags[flagName] !== undefined) {
      return this.flags[flagName];
    }

    // If in one-shot mode but flag missing, error
    if (this.hasFlags()) {
      this.out(`Error: --${flagName} is required when using flags`);
      this.out('');
      this.out(`Run 'easyskillz ${commandName} --help' for usage information.`);
      process.exit(1);
    }

    // Interactive mode
    if (this.isTTY) {
      return await this.prompt(question, commandName);
    }

    // Non-TTY, no flag - use default
    return defaultValue;
  }

  /**
   * Confirm action (with AI detection)
   * @param {string} message - Confirmation message
   * @param {string} commandName - Command name for AI warning
   * @param {boolean} requireConfirmFlag - If true, require --confirm flag for AI
   * @returns {Promise<boolean>} True if confirmed
   */
  async confirm(message, commandName, requireConfirmFlag = true) {
    // If --confirm flag provided, auto-confirm
    if (this.flags.confirm) {
      return true;
    }

    // If in one-shot mode and confirm required, check AI first then error
    if (requireConfirmFlag && this.hasFlags()) {
      // Check for AI agent and show helpful warning
      if (isAIAgent()) {
        showAIWarning(commandName);
        process.exit(1);
      }
      
      // Not AI, show generic error
      this.out('Error: --confirm flag is required when using flags');
      this.out('');
      this.out(`Run 'easyskillz ${commandName} --help' for usage information.`);
      process.exit(1);
    }

    // Interactive mode
    if (this.isTTY) {
      // Check for AI before prompting
      if (isAIAgent()) {
        showAIWarning(commandName);
        process.exit(1);
      }

      const answer = await this.prompt(message, commandName);
      return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
    }

    // Non-TTY, no flag - default to false (safe)
    return false;
  }

  /**
   * Output JSON response
   * @param {object} data - Data to output
   */
  jsonOutput(data) {
    if (this.json) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  /**
   * Output error and exit
   * @param {string} message - Error message
   * @param {number} code - Exit code
   */
  error(message, code = 1) {
    if (this.json) {
      console.log(JSON.stringify({ ok: false, error: message }));
    } else {
      this.out(`Error: ${message}`);
    }
    process.exit(code);
  }

  /**
   * Execute the command (to be overridden by subclasses)
   */
  async execute() {
    throw new Error('execute() must be implemented by subclass');
  }
}

module.exports = BaseCommand;
