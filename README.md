# Claude Code Prompt Optimizer

![Claude Code Prompt Optimizer](./assets/header.png)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-green)](https://nodejs.org)
[![Anthropic API](https://img.shields.io/badge/Anthropic-Claude%20Opus%204.1-blue)](https://www.anthropic.com)

A Claude Code hook that transforms simple prompts into detailed, structured instructions. Add `<optimize>` to any prompt and it'll expand your request into something Claude can really sink its teeth into.

## What It Does

When you tag a prompt with `<optimize>`, this hook intercepts it and runs it through Claude Opus 4.1's extended thinking mode. The result is a fleshed-out version of your original request with:

- Specific implementation steps
- Error handling considerations
- Testing requirements
- Edge cases to watch for

Basically, it does the prompt engineering for you.

## Requirements

- Claude Code CLI
- Node.js 18+
- Anthropic API key with Opus access

## Setup

Clone and install:

```bash
git clone https://github.com/johnpsasser/claude-code-prompt-optimizer.git
cd claude-code-prompt-optimizer
npm install
```

Add your API key to your shell profile:

```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

Add the hook to `~/.config/claude-code/settings.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": {
      "type": "command",
      "command": "/path/to/claude-code-prompt-optimizer/src/hooks/optimize-prompt.sh"
    }
  }
}
```

Test it:

```
<optimize> write a function to calculate fibonacci numbers
```

For detailed setup instructions and troubleshooting, see [QUICKSTART.md](QUICKSTART.md).

## Examples

**Before:**
```
<optimize> create a REST API
```

**After:**
The optimizer expands this into specs covering architecture, endpoints, error handling, auth, validation, and testing.

**Before:**
```
<optimize> refactor this codebase for better performance
```

**After:**
You get a structured plan with profiling steps, bottleneck identification, prioritized refactoring targets, and benchmarking criteria.

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key | Required |
| `DEBUG` | Enable debug logging | `false` |

Debug logs go to `/tmp/claude-code-hook-debug.log`.

## Project Structure

```
claude-code-prompt-optimizer/
├── src/hooks/
│   ├── optimize-prompt.ts    # Core optimization logic
│   └── optimize-prompt.sh    # Shell wrapper
├── examples/                  # Usage examples
├── docs/                      # Additional documentation
└── QUICKSTART.md             # Installation guide
```

## How It Works

1. Hook watches for `<optimize>` in your input
2. Sends your prompt to Claude Opus 4.1 with a 10,000 token thinking budget
3. Returns the expanded prompt back to Claude Code

Takes about 2-5 seconds.

## Troubleshooting

**Hook not triggering:**
- Check your settings.json path
- Run `chmod +x src/hooks/optimize-prompt.sh`
- Enable debug mode and check the logs

**API errors:**
- Make sure `ANTHROPIC_API_KEY` is exported
- Verify you have Opus access
- Check rate limits

**Missing deps:**
- Run `npm install`
- Check Node version is 18+

## Development

```bash
# Run directly
npx tsx src/hooks/optimize-prompt.ts < test-input.json

# Run with debug output
DEBUG=true bash src/hooks/optimize-prompt.sh < test-input.json

# Compile
npx tsc
```

## Contributing

PRs welcome. Fork it, make a branch, add tests, submit.

## License

MIT. See [LICENSE](LICENSE).
