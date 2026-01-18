#!/usr/bin/env tsx

import Anthropic from '@anthropic-ai/sdk';
import { execSync } from 'child_process';
import * as fs from 'fs';

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

const OPTIMIZATION_SYSTEM_PROMPT = `You are a prompt optimization specialist for Claude Opus 4.5. Your job is to transform user prompts to maximize the model's advanced reasoning capabilities.

Apply these techniques:
1. **Structured Context**: Add explicit reasoning frameworks and step-by-step instructions
2. **Specificity Enhancement**: Rewrite vague requests into detailed, actionable tasks with clear requirements
3. **Meta-Instructions**: Add Opus 4.5-specific guidance to leverage its extended thinking and planning abilities
4. **Skip-comments**: Do not optimize or transform text in between double quotes ("example")

Transform the prompt to enable maximum reasoning depth. Make it comprehensive, structured, and optimized for complex problem-solving.

Return ONLY the optimized prompt text, nothing else. Do not add preamble like "Here is the optimized prompt:" or any other commentary.`;

/**
 * Optimize prompt using the Anthropic SDK with API key
 */
async function optimizeWithApiKey(originalPrompt: string, apiKey: string): Promise<string> {
  try {
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: 'claude-opus-4-5-20251101',
      max_tokens: 16384,
      thinking: {
        type: 'enabled',
        budget_tokens: 10000,
      },
      system: OPTIMIZATION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Original prompt to optimize:\n${originalPrompt}`,
        },
      ],
    });

    const optimizedPrompt = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    return optimizedPrompt || originalPrompt;
  } catch (error) {
    throw new Error(`API optimization failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Optimize prompt using Claude Code CLI (uses OAuth token from Claude MAX subscription)
 */
function optimizeWithCli(originalPrompt: string): string {
  // Remove ANTHROPIC_API_KEY from env so CLI uses OAuth token
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;

  // Find claude CLI - check common locations
  const claudePaths = [
    `${process.env.HOME}/.claude/local/claude`,
    '/usr/local/bin/claude',
    'claude', // Try PATH
  ];

  let claudePath = '';
  for (const path of claudePaths) {
    try {
      execSync(`"${path}" --version`, { env, stdio: 'pipe' });
      claudePath = path;
      break;
    } catch {
      continue;
    }
  }

  if (!claudePath) {
    throw new Error('Claude CLI not found. Install it via: npm install -g @anthropic-ai/claude-code');
  }

  // Write prompts to temp files to avoid shell escaping issues
  const timestamp = Date.now();
  const promptFile = `/tmp/prompt-${timestamp}.txt`;
  const systemFile = `/tmp/system-${timestamp}.txt`;

  try {
    fs.writeFileSync(promptFile, `Original prompt to optimize:\n${originalPrompt}`);
    fs.writeFileSync(systemFile, OPTIMIZATION_SYSTEM_PROMPT);

    const result = execSync(
      `"${claudePath}" --print --output-format text --model haiku --system-prompt "$(cat '${systemFile}')" --dangerously-skip-permissions "$(cat '${promptFile}')"`,
      {
        env,
        timeout: 60000,
        maxBuffer: 10 * 1024 * 1024,
        encoding: 'utf8',
        shell: '/bin/bash',
      }
    );

    return result.trim() || originalPrompt;
  } finally {
    // Clean up temp files
    try { fs.unlinkSync(promptFile); } catch {}
    try { fs.unlinkSync(systemFile); } catch {}
  }
}

/**
 * Main optimization function - tries API key first, falls back to CLI
 */
async function optimizePrompt(originalPrompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Try API key mode first (if available)
  if (apiKey) {
    try {
      return await optimizeWithApiKey(originalPrompt, apiKey);
    } catch (error) {
      console.error(`[Prompt Optimizer] API mode failed: ${error instanceof Error ? error.message : String(error)}`);
      console.error('[Prompt Optimizer] Falling back to CLI mode...');
    }
  }

  // Fall back to CLI mode (uses OAuth)
  try {
    return optimizeWithCli(originalPrompt);
  } catch (error) {
    console.error(
      JSON.stringify({
        reason: `Prompt optimization failed: ${error instanceof Error ? error.message : String(error)}. Proceeding with original prompt.`,
      })
    );
    return originalPrompt;
  }
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
