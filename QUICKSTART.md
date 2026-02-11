# Quick Start Guide - Claude Code Prompt Optimizer

Get the prompt optimizer running in under 5 minutes!

## Pre-flight Checklist

Before starting, ensure you have:
- Claude Code CLI installed
- Node.js 18.0.0+ (`node --version`)
- npm or yarn package manager
- **One of the following:**
  - Anthropic API key with Claude Opus access, OR
  - Claude MAX subscription (logged into Claude Code)

## Step-by-Step Installation

### Step 1: Clone the Repository

```bash
# Navigate to your preferred directory
cd ~/projects  # or wherever you keep your code

# Clone the repository
git clone https://github.com/johnpsasser/claude-code-prompt-optimizer.git

# Enter the project directory
cd claude-code-prompt-optimizer
```

### Step 2: Install Dependencies

```bash
# Install required packages
npm install

# Verify installation
npm list @anthropic-ai/sdk tsx
```

Expected output:
```
claude-code-prompt-optimizer@1.2.0
├── @anthropic-ai/sdk@0.36.0
└── tsx@4.19.0
```

### Step 3: Configure Authentication

Choose **one** of the following options:

#### Option A: API Key (For API Credit Users)

**Quick Test (Current Session Only):**
```bash
export ANTHROPIC_API_KEY="sk-ant-api03-..."
```

**Permanent (Add to Shell Profile):**

For **zsh** (default on macOS):
```bash
echo 'export ANTHROPIC_API_KEY="sk-ant-api03-..."' >> ~/.zshrc
source ~/.zshrc
```

For **bash**:
```bash
echo 'export ANTHROPIC_API_KEY="sk-ant-api03-..."' >> ~/.bashrc
source ~/.bashrc
```

Verify it's set:
```bash
echo $ANTHROPIC_API_KEY | head -c 20  # Should show first 20 chars
```

#### Option B: OAuth (For Claude MAX Subscribers)

No API key needed! The optimizer will automatically use your Claude MAX subscription via the CLI.

Just verify you're logged in:
```bash
# Check CLI is installed
claude --version

# Start Claude to verify auth (exit with Ctrl+C)
claude
```

If Claude starts without auth errors, you're good to go.

**Note:** If you have both an API key and Claude MAX, the optimizer tries API key first and falls back to OAuth if it fails.

### Step 4: Configure Claude Code Hook

1. **Find your Claude Code config directory:**
```bash
# Check if config directory exists
ls -la ~/.claude/
```

2. **Create or edit settings.json:**
```bash
# Open the settings file (create if doesn't exist)
nano ~/.claude/settings.json
```

3. **Add the hook configuration:**
```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "/absolute/path/to/claude-code-prompt-optimizer/src/hooks/optimize-prompt.sh"
          }
        ]
      }
    ]
  }
}
```

**Important**: Replace `/absolute/path/to/` with your actual path!

To get the correct path:
```bash
# From within the project directory
echo "$PWD/src/hooks/optimize-prompt.sh"
```

### Step 5: Make Hook Executable

```bash
# Ensure the shell script has execute permissions
chmod +x src/hooks/optimize-prompt.sh
```

### Step 6: Test the Installation

1. **Create a test file:**
```bash
cat > test-input.json << 'EOF'
{
  "prompt": "<optimize> write a hello world function",
  "session_id": "test-session",
  "transcript_path": "/tmp/test",
  "hook_event_name": "UserPromptSubmit"
}
EOF
```

2. **Run the test:**
```bash
npm test
```

You should see:
```
------------------------------------------------------------
PROMPT OPTIMIZER - ULTRATHINK MODE ENABLED
------------------------------------------------------------

Original Prompt: write a hello world function

Optimized Prompt: [Enhanced version will appear here]
```

## Using the Optimizer

### In Claude Code

Simply add `<optimize>` to any prompt:

```
<optimize> create a user authentication system
```

The optimizer will:
1. Detect the `<optimize>` tag
2. Send your prompt to Claude (via API or CLI)
3. Return an enhanced, structured version
4. Execute the optimized prompt

### Examples

#### Simple Task
**Input:**
```
<optimize> fix this bug
```

**Result:** Comprehensive debugging framework with root cause analysis steps

#### Complex Project
**Input:**
```
<optimize> build a real-time chat application
```

**Result:** Detailed architecture plan with phases, technologies, and implementation steps

## Configuration Options

### Enable Debug Mode

For troubleshooting, enable debug logging:

```bash
# In your shell profile
export DEBUG=true

# Check debug logs
tail -f /tmp/claude-code-hook-debug.log
```

### Force CLI Mode (Skip API Key)

To always use OAuth/CLI mode even if API key is set:

```bash
# Temporarily unset API key
unset ANTHROPIC_API_KEY
```

Or remove it from your shell profile.

### Custom Installation Paths

If you prefer a different location:

```bash
# System-wide installation
sudo cp -r claude-code-prompt-optimizer /opt/
sudo chmod 755 /opt/claude-code-prompt-optimizer/src/hooks/optimize-prompt.sh

# Update settings.json to:
"command": "/opt/claude-code-prompt-optimizer/src/hooks/optimize-prompt.sh"
```

## Troubleshooting

### Hook Not Triggering

**Check 1: Verify Claude Code sees the hook**
```bash
cat ~/.claude/settings.json
```

**Check 2: Test hook directly**
```bash
echo '{"prompt": "<optimize> test", "session_id": "test", "transcript_path": "/tmp/test", "hook_event_name": "UserPromptSubmit"}' | bash src/hooks/optimize-prompt.sh
```

**Check 3: Verify permissions**
```bash
ls -la src/hooks/optimize-prompt.sh
# Should show: -rwxr-xr-x (with x for execute)
```

### API Key Issues

**Error:** "ANTHROPIC_API_KEY environment variable not set"

This is fine if you're using OAuth mode. If you want API mode:
```bash
# Check if key is set
echo $ANTHROPIC_API_KEY

# If empty, set it:
export ANTHROPIC_API_KEY="your-key-here"
```

**Error:** "Unauthorized" or "insufficient credits"

- If using API key: verify you have Opus access and credits
- The optimizer will automatically fall back to CLI/OAuth mode

### CLI/OAuth Mode Issues

**Error:** "Claude CLI not found"

Install Claude Code CLI:
```bash
npm install -g @anthropic-ai/claude-code
```

**Error:** CLI mode timing out

- Ensure you're logged into Claude Code
- Check your internet connection
- Try running `claude --print "test"` directly

### Node.js Issues

**Error:** "npx: command not found"

Install Node.js 18+:
```bash
# macOS:
brew install node

# Ubuntu/Debian:
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Path Issues

**Error:** Hook path not found

```bash
# Get absolute path from project directory
cd claude-code-prompt-optimizer
echo "$PWD/src/hooks/optimize-prompt.sh"

# Copy this exact path to settings.json
```

## Updating the Optimizer

```bash
cd claude-code-prompt-optimizer
git pull origin main
npm install
```

## Testing Without Claude Code

Test the optimizer standalone:

```bash
# Interactive test
node -e "
const input = {
  prompt: '<optimize> create a REST API',
  session_id: 'test',
  transcript_path: '/tmp/test',
  hook_event_name: 'UserPromptSubmit'
};
console.log(JSON.stringify(input));
" | npx tsx src/hooks/optimize-prompt.ts
```

## Verification Checklist

Run through this checklist to ensure everything works:

- [ ] Node.js 18+ installed (`node --version`)
- [ ] Repository cloned and dependencies installed
- [ ] Authentication configured (API key OR logged into Claude Code)
- [ ] Claude Code settings.json configured with correct path
- [ ] Hook script has execute permissions
- [ ] Test command runs successfully
- [ ] `<optimize>` tag triggers in Claude Code

## Pro Tips

1. **Use quotes to preserve exact text:**
   ```
   <optimize> implement a function called "calculateTotalPrice" that does X
   ```

2. **Combine with specific requirements:**
   ```
   <optimize> create a secure API with rate limiting and JWT auth
   ```

3. **Debug specific optimizations:**
   ```bash
   export DEBUG=true
   # Now all optimizations will be logged
   ```

4. **Choose your auth mode:**
   - API key: Faster (2-5s), uses your credits
   - OAuth/CLI: Slower (5-15s), uses Claude MAX subscription

## Getting Help

- **GitHub Issues:** [Report bugs or request features](https://github.com/johnpsasser/claude-code-prompt-optimizer/issues)
- **Discussions:** [Ask questions and share tips](https://github.com/johnpsasser/claude-code-prompt-optimizer/discussions)
- **Debug Logs:** Check `/tmp/claude-code-hook-debug.log` with DEBUG=true

---

**Ready to supercharge your prompts? Try it now with `<optimize>` in Claude Code!**
