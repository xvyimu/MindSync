/**
 * Guard: L1 docs — namespaced `pnpm <script:with:colons>` must exist in root package.json.
 * Scope: docs/project/**, DOCS_POLICY, PROJECT_HANDOFF, docs/README (not archives/workspace).
 * Usage: node scripts/check-docs-pnpm-script-refs.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const scripts = pkg.scripts || {};

/** @type {string[]} */
const mdFiles = [];

function addFile(abs) {
  if (fs.existsSync(abs) && abs.endsWith('.md')) mdFiles.push(abs);
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (ent.isFile() && ent.name.endsWith('.md')) mdFiles.push(p);
  }
}

walk(path.join(root, 'docs', 'project'));
addFile(path.join(root, 'docs', 'DOCS_POLICY.md'));
addFile(path.join(root, 'docs', 'PROJECT_HANDOFF.md'));
addFile(path.join(root, 'docs', 'README.md'));

// Namespaced scripts only: foo:bar or foo:bar:baz (avoids "pnpm workspace", "pnpm 8.")
const re = /\bpnpm\s+(?:run\s+)?([a-zA-Z][\w-]*(?::[\w-]+)+)/g;

let failed = false;
for (const file of mdFiles) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  const body = fs.readFileSync(file, 'utf8');
  const seen = new Set();
  let m;
  re.lastIndex = 0;
  while ((m = re.exec(body)) !== null) {
    const name = m[1];
    if (name.includes('*') || name.endsWith(':')) continue;
    if (scripts[name]) continue;
    // Allow family prefix used in prose: "pnpm release:notes:*" → token release:notes
    if (Object.keys(scripts).some((s) => s.startsWith(`${name}:`))) continue;
    const key = `${rel}::${name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const line = body.slice(0, m.index).split(/\r?\n/).length;
    console.error(
      `[check-docs-pnpm-script-refs] FAIL ${rel}:${line} unknown script ${JSON.stringify(name)}`,
    );
    console.error('  → add to package.json scripts or document node scripts/...');
    failed = true;
  }
}

if (failed) process.exit(1);
console.log(
  `[check-docs-pnpm-script-refs] OK ${mdFiles.length} L1 md file(s); namespaced pnpm refs resolve`,
);
