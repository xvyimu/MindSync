/**
 * Ensure L2 freeze banners exist on archives/workspace READMEs and .pipeline/INDEX.md.
 * Usage: node scripts/check-docs-freeze-banners.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = [
  path.join(root, 'docs', 'archives', 'README.md'),
  path.join(root, 'docs', 'workspace', 'README.md'),
  path.join(root, '.pipeline', 'INDEX.md'),
];

const bannerRe = /L2|冻结|只读|非现行|非产品真相|非产品规范/;

let failed = false;
for (const f of files) {
  if (!fs.existsSync(f)) {
    console.error(`[check-docs-freeze-banners] FAIL missing ${path.relative(root, f)}`);
    failed = true;
    continue;
  }
  const body = fs.readFileSync(f, 'utf8');
  // Prefer banner near top (first 800 chars) so body prose alone does not count
  const head = body.slice(0, 800);
  if (!bannerRe.test(head)) {
    console.error(
      `[check-docs-freeze-banners] FAIL no freeze banner near top of ${path.relative(root, f)}`,
    );
    failed = true;
  } else {
    console.log(`[check-docs-freeze-banners] OK ${path.relative(root, f)}`);
  }
}

process.exit(failed ? 1 : 0);
