#!/usr/bin/env node

import { execFileSync, execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, chmodSync } from 'fs';
import { createInterface } from 'readline';
import { join } from 'path';
import { homedir } from 'os';

const PROJECT_ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const HOOK_SCRIPT = join(PROJECT_ROOT, 'src', 'hooks', 'optimize-prompt.sh');
const CLAUDE_DIR = join(homedir(), '.claude');
const SETTINGS_FILE = join(CLAUDE_DIR, 'settings.json');

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function log(msg) {
  console.log(`\x1b[36m[installer]\x1b[0m ${msg}`);
}

function success(msg) {
  console.log(`\x1b[32m[OK]\x1b[0m ${msg}`);
}

function warn(msg) {
  console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`);
}

function fail(msg) {
  console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`);
  process.exit(1);
}

// ── Pre-flight checks ──────────────────────────────────────────────

function checkNode() {
  const major = parseInt(process.versions.node.split('.')[0], 10);
  if (major < 18) {
    fail(`Node.js 18+ required (found ${process.versions.node})`);
  }
  success(`Node.js ${process.versions.node}`);
}

function checkClaude() {
  try {
    const version = execFileSync('claude', ['--version'], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    success(`Claude CLI found: ${version}`);
    return true;
  } catch {
    warn('Claude CLI not found — OAuth stored login will not be available');
    return false;
  }
}

// ── Install dependencies ───────────────────────────────────────────

function installDeps() {
  log('Installing dependencies...');
  execFileSync('npm', ['install'], { cwd: PROJECT_ROOT, stdio: 'inherit' });
  success('Dependencies installed');
}

// ── Auth setup ─────────────────────────────────────────────────────

function detectShellProfile() {
  const shell = process.env.SHELL || '/bin/zsh';
  if (shell.endsWith('fish')) return join(homedir(), '.config', 'fish', 'config.fish');
  if (shell.endsWith('bash')) {
    const bashrc = join(homedir(), '.bashrc');
    const profile = join(homedir(), '.bash_profile');
    return existsSync(bashrc) ? bashrc : profile;
  }
  return join(homedir(), '.zshrc');
}

function appendToProfile(line) {
  const profile = detectShellProfile();
  const content = existsSync(profile) ? readFileSync(profile, 'utf8') : '';
  if (content.includes(line)) {
    log(`Already in ${profile}`);
    return;
  }
  writeFileSync(profile, content + (content.endsWith('\n') ? '' : '\n') + line + '\n');
  success(`Added to ${profile}`);
  warn(`Run: source ${profile}  (or open a new terminal)`);
}

async function setupAuth(hasClaude) {
  console.log('\n--- Authentication Setup ---\n');
  console.log('The Agent SDK authenticates via OAuth.\n');
  console.log('Choose your auth method:\n');
  if (hasClaude) {
    console.log('  1) Stored OAuth (already logged in via `claude login`) [recommended]');
  }
  console.log('  2) OAuth token  (Claude Pro / MAX subscribers)');
  console.log('');

  const choice = await ask(`Enter choice [${hasClaude ? '1/2' : '2'}]: `);

  if (choice === '1' && hasClaude) {
    success('Using stored OAuth from `claude login` — no env vars needed');
  } else if (choice === '2') {
    console.log('\nTo get your OAuth token, run:\n  claude auth token\n');
    const token = await ask('Paste your OAuth token (or press Enter to skip): ');
    if (token) {
      appendToProfile(`export CLAUDE_CODE_OAUTH_TOKEN="${token}"`);
      process.env.CLAUDE_CODE_OAUTH_TOKEN = token;
    } else {
      warn('Skipped — set CLAUDE_CODE_OAUTH_TOKEN manually later');
    }
  } else {
    warn('No auth configured — run `claude login` or set CLAUDE_CODE_OAUTH_TOKEN later');
  }
}

// ── Hook configuration ─────────────────────────────────────────────

function configureHook() {
  log('Configuring Claude Code hook...');

  let settings = {};
  if (existsSync(SETTINGS_FILE)) {
    try {
      settings = JSON.parse(readFileSync(SETTINGS_FILE, 'utf8'));
    } catch {
      warn('Could not parse existing settings.json — creating fresh');
    }
  }

  if (!settings.hooks) settings.hooks = {};
  if (!settings.hooks.UserPromptSubmit) settings.hooks.UserPromptSubmit = [];

  const hookEntry = {
    hooks: [
      {
        type: 'command',
        command: HOOK_SCRIPT,
      },
    ],
  };

  // Check if hook is already registered
  const already = settings.hooks.UserPromptSubmit.some((entry) =>
    entry.hooks?.some((h) => h.command?.includes('optimize-prompt'))
  );

  if (already) {
    log('Hook already registered in settings.json');
  } else {
    settings.hooks.UserPromptSubmit.push(hookEntry);
    writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2) + '\n');
    success(`Hook added to ${SETTINGS_FILE}`);
  }
}

// ── Permissions ────────────────────────────────────────────────────

function setPermissions() {
  chmodSync(HOOK_SCRIPT, 0o755);
  success(`chmod +x ${HOOK_SCRIPT}`);
}

// ── Verify ─────────────────────────────────────────────────────────

function verify() {
  log('Running quick verification...');
  const testInput = JSON.stringify({
    prompt: 'hello world',
    session_id: 'verify',
    transcript_path: '/tmp/verify',
    hook_event_name: 'UserPromptSubmit',
  });

  try {
    const result = execFileSync('npx', ['tsx', 'src/hooks/optimize-prompt.ts'], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      input: testInput,
      timeout: 15000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const parsed = JSON.parse(result.trim());
    if (parsed.hookSpecificOutput) {
      success('Verification passed — hook returns valid output');
    } else {
      warn('Unexpected output format — check manually');
    }
  } catch (err) {
    warn(`Verification failed: ${err.message}`);
    warn('You can test manually: npm test');
  }
}

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log('\n========================================');
  console.log(' Claude Code Prompt Optimizer Installer');
  console.log('========================================\n');

  checkNode();
  const hasClaude = checkClaude();

  installDeps();
  await setupAuth(hasClaude);
  configureHook();
  setPermissions();
  verify();

  console.log('\n========================================');
  console.log(' Installation complete!');
  console.log('========================================');
  console.log('\nUsage: add <optimize> to any prompt in Claude Code');
  console.log('Example: <optimize> build a REST API with auth\n');
}

main().catch((err) => {
  fail(err.message);
});
