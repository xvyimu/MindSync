/**
 * Guard: PROJECT_HANDOFF.md must not reintroduce known-stale paths / push targets.
 * Allows historical mentions of work/desktop-hardening* as archaeology and
 * PromptOptimizer\ as explicitly deprecated — forbids treating them as active install/push.
 *
 * Usage: node scripts/check-docs-handoff-paths.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const handoffPath = path.join(root, 'docs', 'PROJECT_HANDOFF.md');

if (!fs.existsSync(handoffPath)) {
  console.error('[check-docs-handoff-paths] FAIL: missing docs/PROJECT_HANDOFF.md');
  process.exit(1);
}

const body = fs.readFileSync(handoffPath, 'utf8');
const rules = [
  {
    id: 'stale-codex-path',
    re: /Documents[/\\]Codex|source-extract[/\\]prompt-optimizer-develop/i,
    hint: 'Use D:\\MindSync\\src\\mindsync (see CURRENT.md)',
  },
  {
    id: 'stale-promtoptimizer-as-ssot',
    // Forbid D:\PromtOptimizer\{src|app|docs|nsis|tools|custom-templates} — those imply treating
    // PromtOptimizer as the MindSync source/install tree. Since 2026-07-25 the OFFICIAL
    // PromptOptimizer release genuinely installs at D:\PromtOptimizer\PromptOptimizer.exe, so the
    // bare official-binary mention is allowed; only the fake MindSync-tree subdirs are stale.
    re: /D:\\PromtOptimizer\\(?:src|app|docs|nsis|tools|custom-templates)\b/i,
    hint: 'Active MindSync source is D:\\projects\\MindSync; D:\\PromtOptimizer is only the official release binary (see CURRENT.md / GITHUB_IDENTITY)',
  },
  {
    id: 'claim-upstream-remote-active',
    // Forbid presenting git remote "upstream" as currently configured (attribution URL alone is OK).
    re: /\|\s*upstream\s*\|\s*https?:\/\/github\.com\/linshenkx/i,
    hint: 'No upstream remote; list only origin (see GITHUB_IDENTITY.md)',
  },
  {
    id: 'push-hardening-branch',
    re: /git\s+push\s+origin\s+work\/desktop-hardening[^\s]*/i,
    hint: 'Default push target is origin develop; hardening branches are archaeology only',
  },
  {
    id: 'stale-nsis-2026-07-18',
    re: /nsis-2026-07-18/i,
    hint: 'Current NSIS archive is nsis-2026-07-21-ipc (see CURRENT.md)',
  },
  {
    id: 'deprecated-tree-self-check',
    re: /Test-Path[^\n]*PromptOptimizer[/\\]/i,
    hint: 'Self-check against D:\\MindSync\\app\\ and nsis-2026-07-21-*; see CLEANUP-PLAYBOOK',
  },
  {
    id: 'deprecated-tree-as-app-resources',
    re: /PromptOptimizer[/\\]resources[/\\]app/i,
    hint: 'Deprecated hot-swap tree is not the install root; use D:\\MindSync\\app\\resources\\app.asar',
  },
];

let failed = false;
for (const rule of rules) {
  const m = body.match(rule.re);
  if (m) {
    const idx = body.indexOf(m[0]);
    const line = body.slice(0, idx).split(/\r?\n/).length;
    console.error(
      `[check-docs-handoff-paths] FAIL ${rule.id} at line ~${line}: ${JSON.stringify(m[0])}`,
    );
    console.error(`  → ${rule.hint}`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log('[check-docs-handoff-paths] OK PROJECT_HANDOFF.md (no stale install/push paths)');
