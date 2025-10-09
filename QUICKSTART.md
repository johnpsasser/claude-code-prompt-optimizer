# 🚀 Quick Start Guide - Claude Code Prompt Optimizer

Get the prompt optimizer running in under 5 minutes!

## 📋 Pre-flight Checklist

Before starting, ensure you have:
- ✅ Claude Code CLI installed
- ✅ Node.js 18.0.0+ (`node --version`)
- ✅ npm or yarn package manager
- ✅ Anthropic API key with Claude Opus 4.1 access

## 🎯 Step-by-Step Installation

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
claude-code-prompt-optimizer@1.0.0
├── @anthropic-ai/sdk@0.36.0
└── tsx@4.19.0
```

### Step 3: Configure Your API Key

#### Option A: Export in Current Session (Quick Test)
```bash
export ANTHROPIC_API_KEY="sk-ant-api03-..."
```

#### Option B: Add to Shell Profile (Permanent)

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

### Step 4: Configure Claude Code Hook

1. **Find your Claude Code config directory:**
```bash
# Check if config directory exists
ls -la ~/.config/claude-code/
```

2. **Create or edit settings.json:**
```bash
# Open the settings file (create if doesn't exist)
nano ~/.config/claude-code/settings.json
```

3. **Add the hook configuration:**
```json
{
  "hooks": {
    "UserPromptSubmit": {
      "type": "command",
      "command": "/absolute/path/to/claude-code-prompt-optimizer/src/hooks/optimize-prompt.sh"
    }
  }
}
```

⚠️ **Important**: Replace `/absolute/path/to/` with your actual path!

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
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 PROMPT OPTIMIZER - ULTRATHINK MODE ENABLED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Original Prompt: write a hello world function

✨ Optimized Prompt: [Enhanced version will appear here]
```

## 🎉 Using the Optimizer

### In Claude Code

Simply add `<optimize>` to any prompt:

```
<optimize> create a user authentication system
```

The optimizer will:
1. Detect the `<optimize>` tag
2. Send your prompt to Claude Opus 4.1
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

## 🔧 Configuration Options

### Enable Debug Mode

For troubleshooting, enable debug logging:

```bash
# In your shell profile
export DEBUG=true

# Check debug logs
tail -f /tmp/claude-code-hook-debug.log
```

### Custom Installation Paths

If you prefer a different location:

```bash
# System-wide installation
sudo cp -r claude-code-prompt-optimizer /opt/
sudo chmod 755 /opt/claude-code-prompt-optimizer/src/hooks/optimize-prompt.sh

# Update settings.json to:
"command": "/opt/claude-code-prompt-optimizer/src/hooks/optimize-prompt.sh"
```

## ❓ Troubleshooting

### Hook Not Triggering

**Check 1: Verify Claude Code sees the hook**
```bash
cat ~/.config/claude-code/settings.json
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

**Solution:**
```bash
# Check if key is set
echo $ANTHROPIC_API_KEY

# If empty, set it:
export ANTHROPIC_API_KEY="your-key-here"
```

**Error:** "Unauthorized" or API errors

**Solution:**
- Verify your key has Claude Opus 4.1 access
- Check API key format (should start with `sk-ant-`)
- Ensure no extra spaces or quotes in the key

### Node.js Issues

**Error:** "npx: command not found"

**Solution:**
```bash
# Install Node.js 18+
# macOS:
brew install node

# Ubuntu/Debian:
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Path Issues

**Error:** Hook path not found

**Solution:**
```bash
# Get absolute path from project directory
cd claude-code-prompt-optimizer
echo "$PWD/src/hooks/optimize-prompt.sh"

# Copy this exact path to settings.json
```

## 🔄 Updating the Optimizer

```bash
cd claude-code-prompt-optimizer
git pull origin main
npm install
```

## 🧪 Testing Without Claude Code

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

## 📊 Verification Checklist

Run through this checklist to ensure everything works:

- [ ] Node.js 18+ installed (`node --version`)
- [ ] Repository cloned and dependencies installed
- [ ] ANTHROPIC_API_KEY environment variable set
- [ ] Claude Code settings.json configured with correct path
- [ ] Hook script has execute permissions
- [ ] Test command runs successfully
- [ ] `<optimize>` tag triggers in Claude Code

## 🎯 Next Steps

1. **Try different prompts** with the `<optimize>` tag
2. **Check the examples** directory for use cases
3. **Enable debug mode** to understand the optimization process
4. **Customize** the optimization prompt in `optimize-prompt.ts`
5. **Share your experience** in GitHub Discussions

## 💡 Pro Tips

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

4. **Batch optimize multiple tasks:**
   Keep multiple terminal sessions with different prompts ready

## 🆘 Getting Help

- **GitHub Issues:** [Report bugs or request features](https://github.com/johnpsasser/claude-code-prompt-optimizer/issues)
- **Discussions:** [Ask questions and share tips](https://github.com/johnpsasser/claude-code-prompt-optimizer/discussions)
- **Debug Logs:** Check `/tmp/claude-code-hook-debug.log` with DEBUG=true

---

**Ready to supercharge your prompts? Try it now with `<optimize>` in Claude Code!** 🚀