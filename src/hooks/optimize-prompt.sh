#!/bin/bash

# Claude Code Hook Wrapper Script
# Entry point for the prompt optimization hook (UserPromptSubmit).
#
# Fires on EVERY prompt, so the common case (no <optimize> tag) must be cheap:
# we read stdin and bail immediately, WITHOUT paying Node/tsx/Agent-SDK startup.

# Read the hook payload from stdin once; reuse it below.
INPUT=$(cat)

LOG_FILE="/tmp/claude-code-hook-debug.log"
if [ "$DEBUG" = "true" ]; then
  echo "=== Hook called at $(date) ===" >> "$LOG_FILE"
  echo "Working directory: $(pwd)" >> "$LOG_FILE"
  echo "CLAUDE_CODE_OAUTH_TOKEN set: ${CLAUDE_CODE_OAUTH_TOKEN:+yes}" >> "$LOG_FILE"
  echo "ANTHROPIC_API_KEY set: ${ANTHROPIC_API_KEY:+yes}" >> "$LOG_FILE"
fi

# Fast path: no <optimize> tag → emit nothing and let the prompt pass through
# unchanged. No Node process, no SDK import, no added latency.
if ! printf '%s' "$INPUT" | grep -qi '<optimize>'; then
  [ "$DEBUG" = "true" ] && echo "No <optimize> tag — passthrough (no Node spawn)" >> "$LOG_FILE"
  exit 0
fi

# Ensure node is in PATH; only pay the nvm sourcing cost when it isn't
# (Claude Code spawns hooks without an interactive shell).
if ! command -v node >/dev/null 2>&1; then
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
DIST_BUNDLE="$ROOT_DIR/dist/optimize-prompt.mjs"
TSX_BIN="$ROOT_DIR/node_modules/.bin/tsx"

# Prefer the prebuilt bundle (no TypeScript transpile at hook time — saves
# seconds of the model's timeout budget); then pinned tsx; then npx as last
# resort. Rebuild the bundle with `npm run build` after editing the .ts.
if command -v node >/dev/null 2>&1 && [ -f "$DIST_BUNDLE" ]; then
  printf '%s' "$INPUT" | node "$DIST_BUNDLE"
elif [ -x "$TSX_BIN" ]; then
  printf '%s' "$INPUT" | "$TSX_BIN" "$SCRIPT_DIR/optimize-prompt.ts"
else
  printf '%s' "$INPUT" | npx tsx "$SCRIPT_DIR/optimize-prompt.ts"
fi

EXIT_CODE=$?

if [ "$DEBUG" = "true" ]; then
  echo "Hook completed with exit code: $EXIT_CODE" >> "$LOG_FILE"
  echo "" >> "$LOG_FILE"
fi

exit $EXIT_CODE
