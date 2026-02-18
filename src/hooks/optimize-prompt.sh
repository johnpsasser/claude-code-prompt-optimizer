#!/bin/bash

# Claude Code Hook Wrapper Script
# This script serves as the entry point for the prompt optimization hook

# Ensure nvm/node is in PATH (Claude Code spawns hooks without interactive shell)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

# Optional: Enable debug logging
if [ "$DEBUG" = "true" ]; then
  LOG_FILE="/tmp/claude-code-hook-debug.log"
  echo "=== Hook called at $(date) ===" >> "$LOG_FILE"
  echo "Working directory: $(pwd)" >> "$LOG_FILE"
  echo "CLAUDE_CODE_OAUTH_TOKEN set: ${CLAUDE_CODE_OAUTH_TOKEN:+yes}" >> "$LOG_FILE"
  echo "ANTHROPIC_API_KEY set: ${ANTHROPIC_API_KEY:+yes}" >> "$LOG_FILE"
fi

# Navigate to the hook directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Run the TypeScript optimizer
# Ensure tsx is available and run the optimizer
npx tsx optimize-prompt.ts

# Capture and return the exit code
EXIT_CODE=$?

if [ "$DEBUG" = "true" ]; then
  echo "Hook completed with exit code: $EXIT_CODE" >> "$LOG_FILE"
  echo "" >> "$LOG_FILE"
fi

exit $EXIT_CODE