const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  migrateUserDataIfNeeded,
  dirHasMainData,
  MAIN_DATA_FILE,
} = require('./user-data-migration');

function mkTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'mindsync-migrate-'));
}

test('dirHasMainData detects main json', () => {
  const dir = mkTmp();
  assert.equal(dirHasMainData(dir), false);
  fs.writeFileSync(path.join(dir, MAIN_DATA_FILE), '{}');
  assert.equal(dirHasMainData(dir), true);
});

test('migrates legacy @prompt-optimizer/desktop into empty new userData', () => {
  const root = mkTmp();
  const appData = path.join(root, 'AppData');
  const legacy = path.join(appData, '@prompt-optimizer', 'desktop');
  const neu = path.join(appData, 'MindSync');
  fs.mkdirSync(legacy, { recursive: true });
  fs.writeFileSync(path.join(legacy, MAIN_DATA_FILE), '{"ok":true}');
  fs.writeFileSync(path.join(legacy, 'extra.txt'), 'x');

  const app = {
    getPath(name) {
      if (name === 'appData') return appData;
      if (name === 'userData') return neu;
      throw new Error(name);
    },
  };

  const result = migrateUserDataIfNeeded(app, { log: () => {} });
  assert.equal(result.migrated, true);
  assert.equal(result.from, legacy);
  assert.equal(fs.readFileSync(path.join(neu, MAIN_DATA_FILE), 'utf8'), '{"ok":true}');
  assert.equal(fs.readFileSync(path.join(neu, 'extra.txt'), 'utf8'), 'x');
  // legacy preserved
  assert.equal(fs.existsSync(path.join(legacy, MAIN_DATA_FILE)), true);
});

test('does not overwrite populated new userData', () => {
  const root = mkTmp();
  const appData = path.join(root, 'AppData');
  const legacy = path.join(appData, 'PromptOptimizer');
  const neu = path.join(appData, 'MindSync');
  fs.mkdirSync(legacy, { recursive: true });
  fs.mkdirSync(neu, { recursive: true });
  fs.writeFileSync(path.join(legacy, MAIN_DATA_FILE), '{"legacy":1}');
  fs.writeFileSync(path.join(neu, MAIN_DATA_FILE), '{"new":1}');

  const app = {
    getPath(name) {
      if (name === 'appData') return appData;
      if (name === 'userData') return neu;
      throw new Error(name);
    },
  };

  const result = migrateUserDataIfNeeded(app, { log: () => {} });
  assert.equal(result.migrated, false);
  assert.equal(result.reason, 'new-userdata-already-populated');
  assert.equal(fs.readFileSync(path.join(neu, MAIN_DATA_FILE), 'utf8'), '{"new":1}');
});
