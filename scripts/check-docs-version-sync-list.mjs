/**
 * Guard: docs/project/version-sync.md lists the same paths as
 * scripts/sync-versions.js versionFiles[].path
 *
 * Usage: node scripts/check-docs-version-sync-list.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const syncJs = path.join(root, 'scripts', 'sync-versions.js');
const docPath = path.join(root, 'docs', 'project', 'version-sync.md');

if (!fs.existsSync(syncJs) || !fs.existsSync(docPath)) {
  console.error('[check-docs-version-sync-list] FAIL missing sync-versions.js or version-sync.md');
  process.exit(1);
}

const syncSrc = fs.readFileSync(syncJs, 'utf8');
const doc = fs.readFileSync(docPath, 'utf8');

// Extract path: '...' or path: "..."
const scriptPaths = [...syncSrc.matchAll(/path:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
const uniqueScript = [...new Set(scriptPaths)];

if (uniqueScript.length === 0) {
  console.error('[check-docs-version-sync-list] FAIL no path: entries in sync-versions.js');
  process.exit(1);
}

const missingInDoc = uniqueScript.filter((p) => !doc.includes(p));
// Doc may list extra paths only if they appear as code examples under 添加新的 — allow only script paths as required
let failed = false;
for (const p of missingInDoc) {
  console.error(`[check-docs-version-sync-list] FAIL version-sync.md missing path ${p}`);
  failed = true;
}

// Optional: warn if doc table claims only one file (heuristic)
if (uniqueScript.length >= 2 && /目前自动同步版本号的文件包括：\s*\n\s*\n-\s*`packages\/extension/.test(doc)) {
  console.error('[check-docs-version-sync-list] FAIL doc still describes only extension manifest');
  failed = true;
}

if (failed) process.exit(1);
console.log(
  `[check-docs-version-sync-list] OK ${uniqueScript.length} path(s): ${uniqueScript.join(', ')}`,
);
