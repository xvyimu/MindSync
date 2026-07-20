/**
 * Guard: root package.json version appears in CURRENT.md, HANDOFF header, CHANGELOG top entry.
 * Usage: node scripts/check-docs-version-consistency.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const version = String(
  JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version || '',
);

if (!/^\d+\.\d+\.\d+/.test(version)) {
  console.error(`[check-docs-version-consistency] FAIL bad package version ${version}`);
  process.exit(1);
}

const checks = [
  {
    id: 'CURRENT.md',
    file: path.join(root, 'docs', 'project', 'CURRENT.md'),
    test: (body) =>
      body.includes(`**${version}**`) ||
      new RegExp(`产品版本[^\\n]*${version.replace(/\./g, '\\.')}`).test(body),
  },
  {
    id: 'PROJECT_HANDOFF.md',
    file: path.join(root, 'docs', 'PROJECT_HANDOFF.md'),
    test: (body) => {
      const head = body.slice(0, 2500);
      return (
        head.includes(version) &&
        (head.includes('产品版本') || head.includes('**' + version + '**'))
      );
    },
  },
  {
    id: 'CHANGELOG.md',
    file: path.join(root, 'CHANGELOG.md'),
    test: (body) => {
      // First version heading should be current
      const m = body.match(/^##\s*\[(\d+\.\d+\.\d+)\]/m);
      return m && m[1] === version;
    },
  },
];

let failed = false;
for (const c of checks) {
  if (!fs.existsSync(c.file)) {
    console.error(`[check-docs-version-consistency] FAIL missing ${c.id}`);
    failed = true;
    continue;
  }
  const body = fs.readFileSync(c.file, 'utf8');
  if (!c.test(body)) {
    console.error(
      `[check-docs-version-consistency] FAIL ${c.id} does not reflect package version ${version}`,
    );
    failed = true;
  } else {
    console.log(`[check-docs-version-consistency] OK ${c.id} ↔ ${version}`);
  }
}

if (failed) process.exit(1);
console.log(`[check-docs-version-consistency] OK all anchors for ${version}`);
