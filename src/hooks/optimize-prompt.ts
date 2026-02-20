#!/usr/bin/env tsx

import { query } from '@anthropic-ai/claude-agent-sdk';

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

const OPTIMIZATION_SYSTEM_PROMPT = `You are a prompt optimization specialist for Claude Opus 4.6. Your job is to transform user prompts to maximize the model's advanced reasoning capabilities.

Apply these techniques:
1. **Structured Context**: Add explicit reasoning frameworks and step-by-step instructions
2. **Specificity Enhancement**: Rewrite vague requests into detailed, actionable tasks with clear requirements
3. **Meta-Instructions**: Add Opus 4.6-specific guidance to leverage its extended thinking and planning abilities
4. **Skip-comments**: Do not optimize or transform text in between double quotes ("example")

Transform the prompt to enable maximum reasoning depth. Make it comprehensive, structured, and optimized for complex problem-solving.

Return ONLY the optimized prompt text, nothing else. Do not add preamble like "Here is the optimized prompt:" or any other commentary.`;

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
 * Forces OAuth auth by stripping ALL API key sources so the bundled CLI
 * falls through to stored OAuth credentials from `claude login`.
 *
 * Returns a new env object (does not mutate process.env).
 */
function buildCleanEnv(): Record<string, string | undefined> {
  const env = { ...process.env };

  // Allow Agent SDK to spawn a claude subprocess inside a Claude Code session
  delete env.CLAUDECODE;

  // Force OAuth: nuke every possible API key vector so the CLI subprocess
  // cannot find a key from env, file descriptor, or parent-injected vars.
  env.ANTHROPIC_API_KEY = '';
  delete env.CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR;

  return env;
}

async function optimizePrompt(originalPrompt: string): Promise<string> {
  const env = buildCleanEnv();

  const q = query({
    prompt: `Original prompt to optimize:\n${originalPrompt}`,
    options: {
      model: 'claude-sonnet-4-5-20250929',
      systemPrompt: OPTIMIZATION_SYSTEM_PROMPT,
      maxTurns: 1,
      allowedTools: [],
      permissionMode: 'bypassPermissions',
      settingSources: [],
      env,
      stderr: (data: string) => {
        console.error('[sdk]', data.trim());
      },
    },
  });

  let result = '';
  try {
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
  } catch (e) {
    // If we already got a successful result, use it even if the process exited uncleanly
    if (!result) throw e instanceof Error ? e : new Error('Agent SDK query failed before returning a result');
  }

  return result.trim() || originalPrompt;
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

    if (!shouldOptimize(hookInput.prompt)) {
      const output: HookOutput = {
        hookSpecificOutput: {
          hookEventName: 'UserPromptSubmit',
          additionalContext: hookInput.prompt,
        },
      };
      await writeAndExit(JSON.stringify(output));
    }

    const cleanedPrompt = stripOptimizeTag(hookInput.prompt);
    const optimizedPrompt = await optimizePrompt(cleanedPrompt);

    console.error('\n------------------------------------------------------------');
    console.error('PROMPT OPTIMIZER - ULTRATHINK MODE ENABLED');
    console.error('------------------------------------------------------------');
    console.error('\nOriginal Prompt:');
    console.error(`   ${cleanedPrompt}`);
    console.error('\nOptimized Prompt:');
    console.error(`   ${optimizedPrompt.split('\n').join('\n   ')}`);
    console.error('\n------------------------------------------------------------\n');

    const userMessage = `------------------------------------------------------------
PROMPT OPTIMIZER - ULTRATHINK MODE ENABLED
------------------------------------------------------------

Original Prompt: ${cleanedPrompt}

Optimized Prompt:

${optimizedPrompt}`;

    const output: HookOutput = {
      systemMessage: userMessage,
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: userMessage,
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
