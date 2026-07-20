/**
 * Ensure docs/archives has a freeze banner in README (idempotent check).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = [
  path.join(root, 'docs', 'archives', 'README.md'),
  path.join(root, 'docs', 'workspace', 'README.md'),
];

let failed = false;
for (const f of files) {
  if (!fs.existsSync(f)) {
    console.error(`[check-docs-freeze-banners] FAIL missing ${path.relative(root, f)}`);
    failed = true;
    continue;
  }
  const body = fs.readFileSync(f, 'utf8');
  if (!/L2|冻结|只读|非现行|非产品真相/.test(body)) {
    console.error(`[check-docs-freeze-banners] FAIL no freeze banner in ${path.relative(root, f)}`);
    failed = true;
  } else {
    console.log(`[check-docs-freeze-banners] OK ${path.relative(root, f)}`);
  }
}

process.exit(failed ? 1 : 0);
