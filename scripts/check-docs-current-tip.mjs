/**
 * Guard: docs/project/CURRENT.md 「本仓 tip（SSOT）」 short hash must name HEAD or an
 * ancestor of it -- i.e. CURRENT.md still describes this line of history.
 *
 * Rejects: a hash unknown to the repo, or one on a diverged/abandoned branch.
 * Accepts: HEAD itself, or any ancestor (recording a hash necessarily creates a
 * newer commit, so exact equality is unsatisfiable in CI).
 * Skips: a shallow clone missing the commit, where a bad hash and unfetched
 * history are indistinguishable. Use fetch-depth: 0 in CI to enforce there.
 *
 * CI-friendly: exit 0 when aligned; exit 1 on missing row / stale hash / not a git work tree.
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

if (headFull.toLowerCase().startsWith(docTip)) {
  console.log(
    `[check-docs-current-tip] OK CURRENT tip \`${docTip}\` ↔ HEAD \`${headFull.slice(0, 7)}\``,
  );
  process.exit(0);
}

// What this gate is for: catching a CURRENT.md left pointing at an abandoned or
// diverged branch. Ancestry answers exactly that, and nothing else is asserted.
//
// Two designs were tried and rejected first, both recorded here so they are not
// re-attempted:
//
//   tip === HEAD    Self-referential and unsatisfiable. Writing the hash into
//                   CURRENT.md creates a new commit, so the file can only ever
//                   name its own parent -- every commit left CI red.
//   lag <= MAX_LAG  "Commits behind" has no stable meaning across a branchy
//                   history: HEAD~10 walks first-parent while rev-list --count
//                   counts everything reachable. Here they disagree 10 vs 15,
//                   so any threshold would fire on merges rather than staleness.
//
// Ancestry has neither problem: it is exact, order-independent, and unaffected by
// merges. A tip that is an ancestor of HEAD describes this line of history, which
// is the whole claim CURRENT.md makes.
const isShallow =
  execFileSync('git', ['rev-parse', '--is-shallow-repository'], {
    cwd: root,
    encoding: 'utf8',
  }).trim() === 'true';

let tipFull = null;
try {
  tipFull = execFileSync('git', ['rev-parse', '--verify', `${docTip}^{commit}`], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
} catch {
  // Unreachable and not-yet-fetched are indistinguishable in a truncated clone,
  // and only one of them is an error. CI checks out with fetch-depth 1, so this
  // is the normal case there, not an edge case.
  if (isShallow) {
    console.log(
      `[check-docs-current-tip] SKIP shallow clone lacks \`${docTip}\`; cannot distinguish a bad hash from unfetched history (HEAD \`${headFull.slice(0, 7)}\`). Use fetch-depth: 0 to enforce.`,
    );
    process.exit(0);
  }
  fail(
    `CURRENT tip \`${docTip}\` is not a commit in this repository (HEAD is \`${headFull.slice(0, 7)}\`). Update docs/project/CURRENT.md 本仓 tip（SSOT）.`,
  );
}

// Both commits are present, so the path between them is too: this holds in a
// shallow clone exactly as in a full one.
try {
  execFileSync('git', ['merge-base', '--is-ancestor', tipFull, headFull], {
    cwd: root,
    stdio: 'ignore',
  });
} catch {
  fail(
    `CURRENT tip \`${docTip}\` is not an ancestor of HEAD \`${headFull.slice(0, 7)}\` -- it points at a diverged or abandoned commit. Update docs/project/CURRENT.md 本仓 tip（SSOT）.`,
  );
}

console.log(
  `[check-docs-current-tip] OK CURRENT tip \`${docTip}\` is an ancestor of HEAD \`${headFull.slice(0, 7)}\``,
);
process.exit(0);
