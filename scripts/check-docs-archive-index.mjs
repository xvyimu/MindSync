/**
 * Guard: every directory under docs/archives/ (except none) is linked from
 * docs/archives/README.md, and every ./NNN-slug/ link target exists.
 * Usage: node scripts/check-docs-archive-index.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const archivesDir = path.join(root, 'docs', 'archives');
const readmePath = path.join(archivesDir, 'README.md');

if (!fs.existsSync(archivesDir) || !fs.existsSync(readmePath)) {
  console.error('[check-docs-archive-index] FAIL missing docs/archives or README.md');
  process.exit(1);
}

const dirs = fs
  .readdirSync(archivesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

const readme = fs.readFileSync(readmePath, 'utf8');
// Links like ./101-foo/ or ./101-foo)
const linked = new Set(
  [...readme.matchAll(/\]\(\.\/([^)/]+)\/?\)/g)].map((m) => m[1]),
);

let failed = false;
for (const name of dirs) {
  if (!linked.has(name) && !readme.includes(`./${name}`) && !readme.includes(`./${name}/`)) {
    // also allow bare path in table without trailing slash form already covered
    const ok =
      readme.includes(`](./${name}/)`) ||
      readme.includes(`](./${name})`) ||
      readme.includes(`\`${name}\``);
    if (!ok) {
      console.error(`[check-docs-archive-index] FAIL README missing directory ${name}`);
      failed = true;
    }
  }
}

for (const name of linked) {
  const p = path.join(archivesDir, name);
  if (!fs.existsSync(p) || !fs.statSync(p).isDirectory()) {
    console.error(`[check-docs-archive-index] FAIL README links missing dir ${name}`);
    failed = true;
  }
}

// Stricter: every disk dir must appear as ](./name/ or ](./name)
for (const name of dirs) {
  if (!readme.includes(`./${name}`)) {
    console.error(`[check-docs-archive-index] FAIL no ./` + `${name} reference in README`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log(
  `[check-docs-archive-index] OK ${dirs.length} archive dir(s) ↔ README links`,
);
