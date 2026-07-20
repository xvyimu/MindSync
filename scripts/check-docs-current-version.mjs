/**
 * Guard: docs/project/CURRENT.md product version must match root package.json.
 * Usage: node scripts/check-docs-current-version.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const currentPath = path.join(root, 'docs', 'project', 'CURRENT.md');

if (!fs.existsSync(currentPath)) {
  console.error('[check-docs-current-version] FAIL: missing docs/project/CURRENT.md');
  process.exit(1);
}

const body = fs.readFileSync(currentPath, 'utf8');
const version = String(pkg.version || '');
// Expect a bold version cell or explicit 2.x.y near 产品版本
const ok =
  body.includes(`**${version}**`)
  || body.includes(`| **${version}**`)
  || new RegExp(`产品版本[^\\n]*${version.replace(/\./g, '\\.')}`).test(body);

if (!ok) {
  console.error(`[check-docs-current-version] FAIL: package.json version ${version} not reflected in docs/project/CURRENT.md`);
  process.exit(1);
}

console.log(`[check-docs-current-version] OK package ${version} ↔ CURRENT.md`);
