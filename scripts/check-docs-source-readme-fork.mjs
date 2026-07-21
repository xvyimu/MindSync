/**
 * Guard: root README.md / README.zh-CN.md mention this repo identity or CURRENT.md.
 * Accepts MindSync (current) or legacy prompt-optimizer / fork-only wording.
 * Usage: node scripts/check-docs-source-readme-fork.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = ['README.md', 'README.zh-CN.md'].map((n) => path.join(root, n));

let failed = false;
for (const f of files) {
  if (!fs.existsSync(f)) {
    console.error(`[check-docs-source-readme-fork] FAIL missing ${path.basename(f)}`);
    failed = true;
    continue;
  }
  const body = fs.readFileSync(f, 'utf8');
  const ok =
    /xvyimu\/MindSync/.test(body) ||
    /xvyimu\/prompt-optimizer/.test(body) ||
    /docs\/project\/CURRENT\.md/.test(body) ||
    /fork-only/i.test(body) ||
    /independent(?:ly)?\s+maintain/i.test(body) ||
    /独立仓/.test(body);
  if (!ok) {
    console.error(
      `[check-docs-source-readme-fork] FAIL ${path.basename(f)} needs xvyimu/MindSync (or CURRENT.md / independent-repo wording)`,
    );
    failed = true;
  } else {
    console.log(`[check-docs-source-readme-fork] OK ${path.basename(f)}`);
  }
}

if (failed) process.exit(1);
console.log('[check-docs-source-readme-fork] OK');
