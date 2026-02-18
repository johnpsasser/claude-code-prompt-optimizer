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

/**
 * Resolve auth environment for the Agent SDK subprocess.
 *
 * When running as a hook inside Claude Code (CLAUDECODE is set), stored OAuth
 * from `claude login` is guaranteed to work — strip the API key since it may
 * be stale or invalid. For standalone usage, keep the API key for non-MAX users.
 *
 * Priority:
 *   1. CLAUDE_CODE_OAUTH_TOKEN → use OAuth, strip API key
 *   2. Inside Claude Code hook → strip API key, use stored OAuth
 *   3. ANTHROPIC_API_KEY (standalone only) → pass through
 *   4. Neither → Agent SDK falls back to stored OAuth from `claude login`
 */
function resolveAuth(): void {
  // Detect if we're running inside a Claude Code session before clearing the flag
  const insideClaudeCode = !!process.env.CLAUDECODE;

  // Allow Agent SDK to spawn a claude subprocess inside a Claude Code session
  delete process.env.CLAUDECODE;

  // Strip API key when OAuth should be used instead:
  // - Explicit OAuth token set, OR
  // - Running as a hook inside Claude Code (stored OAuth is available)
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN || insideClaudeCode) {
    delete process.env.ANTHROPIC_API_KEY;
  }
}

async function optimizePrompt(originalPrompt: string): Promise<string> {
  resolveAuth();

  const q = query({
    prompt: `Original prompt to optimize:\n${originalPrompt}`,
    options: {
      model: 'claude-sonnet-4-5-20250929',
      systemPrompt: OPTIMIZATION_SYSTEM_PROMPT,
      maxTurns: 1,
      allowedTools: [],
      permissionMode: 'bypassPermissions',
    },
  });

  let result = '';
  try {
    for await (const msg of q) {
      if (msg.type === 'result') {
        result = msg.result;
      }
    }
  } catch {
    // If we already got a result, use it even if the process exited uncleanly
    if (!result) throw new Error('Agent SDK query failed before returning a result');
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
  try {
    let inputData = '';

    for await (const chunk of process.stdin) {
      inputData += chunk;
    }

    const hookInput: HookInput = JSON.parse(inputData);

    if (!shouldOptimize(hookInput.prompt)) {
      console.error('Optimization skipped - <optimize> tag not found');
      const output: HookOutput = {
        hookSpecificOutput: {
          hookEventName: 'UserPromptSubmit',
          additionalContext: hookInput.prompt,
        },
      };
      console.log(JSON.stringify(output));
      process.exit(0);
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

    console.log(JSON.stringify(output));
    process.exit(0);
  } catch (error) {
    console.error(
      JSON.stringify({
        reason: `Hook execution failed: ${error instanceof Error ? error.message : String(error)}`,
      })
    );
    process.exit(0);
  }
}

main();
