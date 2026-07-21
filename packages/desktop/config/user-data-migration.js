/**
 * One-shot userData migration for the MindSync identity cut (P3).
 *
 * Before app.ready / before any FileStorageProvider opens userData:
 * if the new MindSync userData dir is empty (or missing the main data file)
 * and a legacy Prompt Optimizer dir still has data, copy it across.
 *
 * Legacy candidates (Windows-oriented; also works where Electron used package name):
 *   - %APPDATA%/@prompt-optimizer/desktop  (scoped package name era)
 *   - %APPDATA%/PromptOptimizer            (productName era)
 *
 * New default:
 *   - Electron userData for productName "MindSync" / name @mindsync/desktop
 *
 * Safe: never deletes legacy dirs; never overwrites non-empty new main data file.
 */

const fs = require('fs');
const path = require('path');

const MAIN_DATA_FILE = 'prompt-optimizer-data.json';

function dirHasMainData(dir) {
  try {
    return fs.existsSync(path.join(dir, MAIN_DATA_FILE));
  } catch {
    return false;
  }
}

function listLegacyCandidates(appDataRoot) {
  return [
    path.join(appDataRoot, '@prompt-optimizer', 'desktop'),
    path.join(appDataRoot, 'PromptOptimizer'),
    path.join(appDataRoot, '@prompt-optimizer'),
  ];
}

/**
 * Copy directory tree (files + dirs). Skips if dest exists for a file (no overwrite).
 */
function copyDirRecursive(src, dest, log = console.log) {
  if (!fs.existsSync(src)) return { copied: 0, skipped: 0 };
  fs.mkdirSync(dest, { recursive: true });
  let copied = 0;
  let skipped = 0;

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      const sub = copyDirRecursive(from, to, log);
      copied += sub.copied;
      skipped += sub.skipped;
    } else if (entry.isFile()) {
      if (fs.existsSync(to)) {
        skipped += 1;
        continue;
      }
      fs.copyFileSync(from, to);
      copied += 1;
    }
  }
  return { copied, skipped };
}

/**
 * @param {import('electron').App} app
 * @param {{ log?: Function }} [opts]
 * @returns {{ migrated: boolean, from?: string, to?: string, stats?: object, reason?: string }}
 */
function migrateUserDataIfNeeded(app, opts = {}) {
  const log = opts.log || ((...args) => console.log('[user-data-migration]', ...args));

  let appDataRoot;
  let newUserData;
  try {
    appDataRoot = app.getPath('appData');
    newUserData = app.getPath('userData');
  } catch (err) {
    return { migrated: false, reason: `paths-unavailable: ${err.message}` };
  }

  // If new location already has main data, do nothing.
  if (dirHasMainData(newUserData)) {
    return { migrated: false, reason: 'new-userdata-already-populated', to: newUserData };
  }

  const candidates = listLegacyCandidates(appDataRoot).filter((p) => {
    // Never treat new path as legacy source
    if (path.resolve(p) === path.resolve(newUserData)) return false;
    return dirHasMainData(p);
  });

  if (candidates.length === 0) {
    return { migrated: false, reason: 'no-legacy-data', to: newUserData };
  }

  // Prefer the candidate with the newest main data file mtime
  let source = candidates[0];
  let bestMtime = 0;
  for (const c of candidates) {
    try {
      const st = fs.statSync(path.join(c, MAIN_DATA_FILE));
      if (st.mtimeMs >= bestMtime) {
        bestMtime = st.mtimeMs;
        source = c;
      }
    } catch {
      /* ignore */
    }
  }

  log(`Migrating user data: ${source} → ${newUserData}`);
  try {
    fs.mkdirSync(newUserData, { recursive: true });
    const stats = copyDirRecursive(source, newUserData, log);
    // Marker so we can debug later
    try {
      fs.writeFileSync(
        path.join(newUserData, '.mindsync-migrated-from'),
        JSON.stringify(
          {
            from: source,
            at: new Date().toISOString(),
            stats,
          },
          null,
          2,
        ),
        'utf8',
      );
    } catch {
      /* non-fatal */
    }
    log(`Migration done: copied=${stats.copied} skipped=${stats.skipped}`);
    return { migrated: true, from: source, to: newUserData, stats };
  } catch (err) {
    log(`Migration failed: ${err.message}`);
    return { migrated: false, reason: `copy-failed: ${err.message}`, from: source, to: newUserData };
  }
}

module.exports = {
  migrateUserDataIfNeeded,
  listLegacyCandidates,
  MAIN_DATA_FILE,
  dirHasMainData,
  copyDirRecursive,
};
