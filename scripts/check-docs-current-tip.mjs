/**
 * Guard: docs/project/CURRENT.md 「本仓 tip（SSOT）」 short hash must match git HEAD.
 * CI-friendly: exit 0 when aligned; exit 1 on missing row / mismatch / not a git work tree.
 *
 * Usage:
 *   node scripts/check-docs-current-tip.mjs
 *   node scripts/check-docs-current-tip.mjs --allow-missing-git   # docs-only trees (skip git)
 *
 * Tip cell formats accepted:
 *   | **本仓 tip（SSOT）** | **`a621e7a`**（…） |
 *   | **本仓 tip（SSOT）** | `a621e7a` |
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const currentPath = path.join(root, 'docs', 'project', 'CURRENT.md');
const allowMissingGit = process.argv.includes('--allow-missing-git');

function fail(msg) {
  console.error(`[check-docs-current-tip] FAIL: ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(currentPath)) {
  fail('missing docs/project/CURRENT.md');
}

const body = fs.readFileSync(currentPath, 'utf8');
// Prefer the SSOT tip row; fall back to any bold `7-char` near 本仓 tip
const tipRow =
  body.match(/\|\s*\*\*本仓 tip（SSOT）\*\*\s*\|\s*([^|\n]+)\|/u) ||
  body.match(/\|\s*\*\*本仓 tip\*\*\s*\|\s*([^|\n]+)\|/u);

if (!tipRow) {
  fail('CURRENT.md missing 「本仓 tip（SSOT）」 table row');
}

const cell = tipRow[1];
const hashMatch = cell.match(/`([0-9a-f]{7,40})`/i) || cell.match(/\b([0-9a-f]{7,40})\b/i);
if (!hashMatch) {
  fail(`could not parse tip hash from cell: ${cell.trim().slice(0, 80)}`);
}
const docTip = hashMatch[1].toLowerCase();

let headFull;
try {
  headFull = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  }).trim();
} catch (err) {
  if (allowMissingGit) {
    console.log('[check-docs-current-tip] SKIP git unavailable (--allow-missing-git)');
    process.exit(0);
  }
  fail(`git rev-parse failed: ${err && err.message ? err.message : err}`);
}

// Document tip must be a prefix of HEAD (short hash or full).
if (!headFull.toLowerCase().startsWith(docTip)) {
  fail(
    `CURRENT tip \`${docTip}\` ≠ git HEAD short \`${headFull.slice(0, 7)}\` (full ${headFull.slice(0, 12)}…). Update docs/project/CURRENT.md 本仓 tip（SSOT）.`,
  );
}

console.log(
  `[check-docs-current-tip] OK CURRENT tip \`${docTip}\` ↔ HEAD \`${headFull.slice(0, 7)}\``,
);
process.exit(0);
