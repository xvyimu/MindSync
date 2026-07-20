/**
 * Smoke test for docker/generate-config.sh public-key filter.
 * Runs under Git Bash / sh on Windows CI-friendly paths.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, 'docker', 'generate-config.sh');

function runGenerateConfig(envExtra) {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'po-runtime-config-'));
  const outFile = path.join(outDir, 'config.js');
  const env = {
    ...process.env,
    ...envExtra,
    RUNTIME_CONFIG_OUT: outFile,
  };
  // Strip unrelated VITE_ from parent env so the test is deterministic.
  for (const key of Object.keys(env)) {
    if (key.startsWith('VITE_') && !(key in envExtra)) {
      delete env[key];
    }
  }

  const result = spawnSync('sh', [script], {
    env,
    encoding: 'utf8',
    cwd: root,
  });

  return { result, outFile, outDir };
}

test('generate-config injects only public VITE keys and never API secrets', () => {
  const { result, outFile, outDir } = runGenerateConfig({
    VITE_PUBLIC_RELEASE_CHANNEL: 'stable',
    VITE_APP_BUILD_LABEL: 'docker',
    VITE_OPENAI_API_KEY: 'sk-secret-openai',
    VITE_CUSTOM_API_KEY: 'sk-custom',
    VITE_CUSTOM_API_BASE_URL: 'https://provider.example/v1',
    VITE_PUBLIC_API_TOKEN_HINT: 'still-secret',
    VITE_ENABLE_PROMPT_GARDEN_IMPORT: '1',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const body = fs.readFileSync(outFile, 'utf8');

  assert.match(body, /PUBLIC_RELEASE_CHANNEL/);
  assert.match(body, /APP_BUILD_LABEL/);
  assert.equal(body.includes('sk-secret-openai'), false);
  assert.equal(body.includes('sk-custom'), false);
  assert.equal(body.includes('provider.example'), false);
  assert.equal(body.includes('still-secret'), false);
  // Non APP/PUBLIC keys must not inject even if non-sensitive-looking
  assert.equal(body.includes('ENABLE_PROMPT_GARDEN'), false);

  fs.rmSync(outDir, { recursive: true, force: true });
});
