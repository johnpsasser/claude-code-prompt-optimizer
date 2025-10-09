#!/usr/bin/env tsx

import Anthropic from '@anthropic-ai/sdk';

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

const OPTIMIZATION_SYSTEM_PROMPT = `You are a prompt optimization specialist for Claude Opus 4.1. Your job is to transform user prompts to maximize the model's advanced reasoning capabilities.

Apply these techniques:
1. **Structured Context**: Add explicit reasoning frameworks and step-by-step instructions
2. **Specificity Enhancement**: Rewrite vague requests into detailed, actionable tasks with clear requirements
3. **Meta-Instructions**: Add Opus 4.1 -specific guidance to leverage its extended thinking and planning abilities
4. **Skip-comments**: Do not optimize or transform text in between double quotes ("example")

Transform the prompt to enable maximum reasoning depth. Make it comprehensive, structured, and optimized for complex problem-solving.

Return ONLY the optimized prompt text in XML format, nothing else. Do not add preamble like "Here is the optimized prompt:" or any other commentary.`;

async function optimizePrompt(originalPrompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error(
      JSON.stringify({
        reason: 'ANTHROPIC_API_KEY environment variable not set. Proceeding with original prompt.',
      })
    );
    return originalPrompt;
  }

  try {
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 16384,
      thinking: {
        type: 'enabled',
        budget_tokens: 10000,
      },
      system: OPTIMIZATION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `ultrathink

Original prompt to optimize:
${originalPrompt}`,
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
      console.error('⏭️  Optimization skipped - <optimize> tag not found');
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

    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('🧠 PROMPT OPTIMIZER - ULTRATHINK MODE ENABLED');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('\n📝 Original Prompt:');
    console.error(`   ${cleanedPrompt}`);
    console.error('\n✨ Optimized Prompt:');
    console.error(`   ${optimizedPrompt.split('\n').join('\n   ')}`);
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const userMessage = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 PROMPT OPTIMIZER - ULTRATHINK MODE ENABLED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Original Prompt: ${cleanedPrompt}

✨ Optimized Prompt:

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