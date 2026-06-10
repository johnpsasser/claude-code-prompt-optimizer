#!/usr/bin/env tsx

import { query } from '@anthropic-ai/claude-agent-sdk';
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

interface HookInput {
  session_id: string;
  transcript_path: string;
  hook_event_name: string;
  prompt: string;
}

interface HookOutput {
  decision?: 'block';
  reason?: string;
  systemMessage?: string;
  hookSpecificOutput?: {
    hookEventName: string;
    additionalContext?: string;
  };
}

interface OptimizerConfig {
  model: string;
  fallbackModel?: string;
  timeoutMs: number;
  fallbackTimeoutMs: number;
  maxPromptChars: number;
  systemPrompt: string;
}

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

// Config lives next to the SOURCE file. When running the esbuild bundle from
// dist/, import.meta.url points at dist/ — fall back to src/hooks/ there.
const HOOK_DIR = [SCRIPT_DIR, join(SCRIPT_DIR, '..', 'src', 'hooks')].find((dir) =>
  existsSync(join(dir, 'optimizer.config.json')),
) ?? SCRIPT_DIR;

/**
 * Load configuration from optimizer.config.json (next to the source file),
 * with environment-variable overrides. The system prompt lives in its own
 * file so it can be tuned without touching code or bumping the model twice.
 */
function loadConfig(): OptimizerConfig {
  const raw = JSON.parse(readFileSync(join(HOOK_DIR, 'optimizer.config.json'), 'utf8'));
  const systemPrompt = readFileSync(join(HOOK_DIR, raw.systemPromptFile), 'utf8').trim();

  return {
    model: process.env.OPTIMIZER_MODEL || raw.model,
    fallbackModel: process.env.OPTIMIZER_FALLBACK_MODEL || raw.fallbackModel,
    timeoutMs: Number(process.env.OPTIMIZER_TIMEOUT_MS) || raw.timeoutMs || 45000,
    fallbackTimeoutMs:
      Number(process.env.OPTIMIZER_FALLBACK_TIMEOUT_MS) || raw.fallbackTimeoutMs || 30000,
    maxPromptChars: Number(process.env.OPTIMIZER_MAX_PROMPT_CHARS) || raw.maxPromptChars || 12000,
    systemPrompt,
  };
}

/** Write JSON to stdout and wait for it to flush before exiting. */
function writeAndExit(json: string): Promise<never> {
  return new Promise((_, reject) => {
    process.stdout.write(json + '\n', (err) => {
      if (err) reject(err);
      process.exit(0);
    });
  });
}

/**
 * Build a clean environment for the Agent SDK subprocess.
 *
 * Auth is adaptive (override with OPTIMIZER_AUTH=oauth|apikey|auto, default auto):
 *  - oauth   : strip every API-key vector so the CLI uses OAuth/stored login.
 *  - apikey  : keep ANTHROPIC_API_KEY untouched (pure API-credit users).
 *  - auto    : an explicit CLAUDE_CODE_OAUTH_TOKEN wins (strip key); inside a
 *              Claude Code session with no token we strip the (often invalid)
 *              parent-injected key and fall through to stored `claude login`;
 *              outside Claude Code we honor a real API key.
 *
 * Returns a new env object (does not mutate process.env).
 */
function buildCleanEnv(): Record<string, string | undefined> {
  const env = { ...process.env };

  const insideClaudeCode = !!process.env.CLAUDECODE;
  const hasOAuthToken = !!process.env.CLAUDE_CODE_OAUTH_TOKEN;
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
  const mode = (process.env.OPTIMIZER_AUTH || 'auto').toLowerCase();

  let useApiKey: boolean;
  if (mode === 'apikey') {
    useApiKey = true;
  } else if (mode === 'oauth') {
    useApiKey = false;
  } else {
    // auto
    if (hasOAuthToken) useApiKey = false; // explicit OAuth token wins
    else if (insideClaudeCode) useApiKey = false; // strip injected key, use stored login
    else useApiKey = hasApiKey; // standalone: honor a real key
  }

  // Allow Agent SDK to spawn a claude subprocess inside a Claude Code session
  delete env.CLAUDECODE;

  if (!useApiKey) {
    // Nuke every possible API key vector so the CLI subprocess cannot find a
    // key from env, file descriptor, or parent-injected vars.
    env.ANTHROPIC_API_KEY = '';
    delete env.CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR;
  }

  return env;
}

/** Run a single optimization attempt against one model, honoring an abort signal. */
async function runQuery(
  originalPrompt: string,
  model: string,
  systemPrompt: string,
  env: Record<string, string | undefined>,
  abortController: AbortController,
): Promise<string> {
  const q = query({
    prompt: `Original prompt to optimize:\n${originalPrompt}`,
    options: {
      model,
      systemPrompt,
      maxTurns: 1,
      allowedTools: [],
      permissionMode: 'bypassPermissions',
      settingSources: [],
      // make sure the spawned CLI never initializes MCP servers — they are
      // pure startup cost for a single text-rewrite completion
      mcpServers: {},
      strictMcpConfig: true,
      abortController,
      env,
      stderr: (data: string) => {
        console.error('[sdk]', data.trim());
      },
    },
  });

  let result = '';
  for await (const msg of q) {
    if (msg.type === 'result') {
      if ('result' in msg && msg.subtype === 'success') {
        result = msg.result;
      } else {
        const errors = 'errors' in msg ? (msg as any).errors : [];
        throw new Error(`Agent SDK returned error: ${errors.join(', ') || msg.subtype}`);
      }
    }
  }

  return result.trim();
}

interface OptimizeResult {
  text: string;
  model: string;
  elapsedMs: number;
}

/**
 * Optimize a prompt with a per-model timeout and a model fallback chain.
 *
 * Every failure mode — INCLUDING a timeout — advances to the fallback model
 * before giving up; only when the whole chain is exhausted does the error
 * propagate (and the caller fails open with the original prompt). The
 * fallback gets its own, shorter budget so the worst case stays bounded.
 */
async function optimizePrompt(
  originalPrompt: string,
  config: OptimizerConfig,
): Promise<OptimizeResult> {
  const env = buildCleanEnv();
  const attempts = [{ model: config.model, budgetMs: config.timeoutMs }];
  if (config.fallbackModel && config.fallbackModel !== config.model) {
    attempts.push({ model: config.fallbackModel, budgetMs: config.fallbackTimeoutMs });
  }

  let lastErr: unknown;
  for (const { model, budgetMs } of attempts) {
    const abortController = new AbortController();
    const timer = setTimeout(() => abortController.abort(), budgetMs);
    const startedAt = Date.now();
    try {
      const result = await runQuery(originalPrompt, model, config.systemPrompt, env, abortController);
      return { text: result || originalPrompt, model, elapsedMs: Date.now() - startedAt };
    } catch (e) {
      const timedOut = abortController.signal.aborted;
      lastErr = timedOut ? new Error(`optimization timed out after ${budgetMs}ms (${model})`) : e;
      const msg = e instanceof Error ? e.message : String(e);
      console.error(
        timedOut
          ? `[optimizer] ${model} timed out after ${budgetMs}ms, trying fallback`
          : `[optimizer] model ${model} failed, trying fallback: ${msg}`,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error('optimization failed for all models');
}

function shouldOptimize(prompt: string): boolean {
  return /<optimize>/i.test(prompt);
}

function stripOptimizeTag(prompt: string): string {
  return prompt.replace(/<\/?optimize\/?>/gi, '').trim();
}

async function main() {
  let inputData = '';
  try {
    for await (const chunk of process.stdin) {
      inputData += chunk;
    }

    const hookInput: HookInput = JSON.parse(inputData);

    // Passthrough: emit nothing so the prompt proceeds unchanged. (The shell
    // wrapper normally short-circuits this case before launching Node; this is
    // the safety net if the hook is invoked directly.)
    if (!shouldOptimize(hookInput.prompt)) {
      await writeAndExit('');
    }

    const config = loadConfig();
    const cleanedPrompt = stripOptimizeTag(hookInput.prompt);

    // Oversize guard: rewriting a truncated prompt would corrupt intent, and
    // optimizing a huge one blows the latency budget — pass through instead.
    if (cleanedPrompt.length > config.maxPromptChars) {
      const note =
        `[prompt-optimizer] Prompt is ${cleanedPrompt.length} chars ` +
        `(limit ${config.maxPromptChars}) — too large to optimize quickly; passed through unchanged.`;
      console.error(note);
      const output: HookOutput = {
        systemMessage: note,
        hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: note },
      };
      await writeAndExit(JSON.stringify(output));
    }

    const { text: optimizedPrompt, model: usedModel, elapsedMs } =
      await optimizePrompt(cleanedPrompt, config);
    const header = `PROMPT OPTIMIZER (${usedModel}, ${(elapsedMs / 1000).toFixed(1)}s)`;

    console.error('\n------------------------------------------------------------');
    console.error(header);
    console.error('------------------------------------------------------------');
    console.error('\nOriginal Prompt:');
    console.error(`   ${cleanedPrompt}`);
    console.error('\nOptimized Prompt:');
    console.error(`   ${optimizedPrompt.split('\n').join('\n   ')}`);
    console.error('\n------------------------------------------------------------\n');

    // Transcript banner for the user: full before/after view.
    const userMessage = `------------------------------------------------------------
${header}
------------------------------------------------------------

Original Prompt: ${cleanedPrompt}

Optimized Prompt:

${optimizedPrompt}`;

    // Injected context for the model: optimized prompt only — the original is
    // already the user message; duplicating it just burns context tokens.
    const injectedContext = `${header}
The user's prompt was rewritten by the prompt-optimizer hook. Treat the following optimized version as the operative instructions:

${optimizedPrompt}`;

    const output: HookOutput = {
      systemMessage: userMessage,
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: injectedContext,
      },
    };

    await writeAndExit(JSON.stringify(output));
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[prompt-optimizer] ERROR: ${errMsg}`);

    // Extract original prompt from input if possible
    let originalPrompt = '';
    try { originalPrompt = JSON.parse(inputData).prompt?.replace(/<\/?optimize\/?>/gi, '').trim() ?? ''; } catch {}

    // Output valid hook JSON so the user sees something went wrong
    const output: HookOutput = {
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: `[prompt-optimizer] Optimization failed: ${errMsg}${originalPrompt ? `\n\nOriginal prompt (unmodified):\n${originalPrompt}` : ''}`,
      },
    };
    await writeAndExit(JSON.stringify(output));
  }
}

main();
