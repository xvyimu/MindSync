/**
 * R5 design-token audit (design constitution §4.3 / §4.4 / C1–C5).
 *
 * Legal spacing: 0 / 4 / 8 / 16 / 24 / 32 (px)
 * Legal type scale: 12 / 14 / 16 / 18 (px) for body text
 * Decorative icon/emoji sizes may be allowlisted.
 *
 * Usage:
 *   node packages/ui/scripts/audit-design-tokens.mjs
 *   node packages/ui/scripts/audit-design-tokens.mjs --json
 *   node packages/ui/scripts/audit-design-tokens.mjs --check
 *
 * --check exits 1 when any finding is not covered by the exceptions file.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UI_ROOT = path.resolve(__dirname, '..')
const SRC_ROOT = path.join(UI_ROOT, 'src')
const EXCEPTIONS_PATH = path.join(__dirname, 'audit-design-tokens.exceptions.json')

/** @typedef {{ file: string, line: number, kind: string, value: string, snippet: string }} Finding */

export const LEGAL_SPACING_PX = new Set([0, 4, 8, 16, 24, 32])
export const LEGAL_FONT_PX = new Set([12, 14, 16, 18])

/** Touch / chrome metrics that are not "layout spacing scale". */
const SPACING_PROP =
  /(?:padding(?:-(?:top|right|bottom|left))?|margin(?:-(?:top|right|bottom|left))?|gap|row-gap|column-gap|top|right|bottom|left|inset|scroll-margin(?:-(?:top|right|bottom|left))?)\s*[:=]\s*['"]?/i

const FONT_SIZE_PROP = /font-size\s*[:=]\s*['"]?/i

const PX_VALUE = /(\d+(?:\.\d+)?)px\b/gi

/**
 * @param {string} line
 * @param {number} lineNo
 * @param {string} relFile
 * @returns {Finding[]}
 */
export function analyzeLine(line, lineNo, relFile) {
  /** @type {Finding[]} */
  const out = []
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
    return out
  }
  // Skip pure comments in vue templates
  if (trimmed.startsWith('<!--')) return out

  // Spacing: only when a spacing-ish property is present on the line
  if (SPACING_PROP.test(line)) {
    SPACING_PROP.lastIndex = 0
    let m
    const re = new RegExp(PX_VALUE.source, 'gi')
    while ((m = re.exec(line)) !== null) {
      const n = Number(m[1])
      if (!Number.isFinite(n)) continue
      // Ignore 1px hairlines and 2px focus rings
      if (n === 1 || n === 2) continue
      // Ignore off-screen / absolute layout tricks (e.g. left: -9999px)
      if (n < 0 || n >= 100) continue
      if (!LEGAL_SPACING_PX.has(n)) {
        out.push({
          file: relFile,
          line: lineNo,
          kind: 'illegal-spacing',
          value: `${n}px`,
          snippet: trimmed.slice(0, 160),
        })
      }
    }
  }

  // Font sizes
  if (FONT_SIZE_PROP.test(line)) {
    FONT_SIZE_PROP.lastIndex = 0
    let m
    const re = new RegExp(PX_VALUE.source, 'gi')
    while ((m = re.exec(line)) !== null) {
      const n = Number(m[1])
      if (!Number.isFinite(n)) continue
      if (!LEGAL_FONT_PX.has(n)) {
        out.push({
          file: relFile,
          line: lineNo,
          kind: 'illegal-font-size',
          value: `${n}px`,
          snippet: trimmed.slice(0, 160),
        })
      }
    }
  }

  // Inline style="...font-size: Npx" / margin: Npx without separate prop word sometimes
  // (already covered when prop keyword is on same line)

  // Shorthand margin/padding: "12px" in style="margin: 12px" — covered by SPACING_PROP
  // margin: 0 0 12px 0 — SPACING_PROP matches margin
  return out
}

/**
 * @param {string} content
 * @param {string} relFile
 * @returns {Finding[]}
 */
export function analyzeContent(content, relFile) {
  const lines = content.split(/\r?\n/)
  /** @type {Finding[]} */
  const findings = []
  for (let i = 0; i < lines.length; i++) {
    findings.push(...analyzeLine(lines[i], i + 1, relFile))
  }
  return findings
}

/**
 * @param {string} dir
 * @param {string[]} acc
 */
function walk(dir, acc) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === 'dist') continue
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(full, acc)
    else if (/\.(vue|css|ts|tsx)$/.test(ent.name)) acc.push(full)
  }
}

/**
 * @param {string} [srcRoot]
 * @returns {Finding[]}
 */
export function scanRepo(srcRoot = SRC_ROOT) {
  /** @type {string[]} */
  const files = []
  if (!fs.existsSync(srcRoot)) return []
  walk(srcRoot, files)
  /** @type {Finding[]} */
  const all = []
  for (const full of files) {
    const rel = path.relative(UI_ROOT, full).replace(/\\/g, '/')
    const content = fs.readFileSync(full, 'utf8')
    all.push(...analyzeContent(content, rel))
  }
  return all
}

/**
 * @returns {{ allow: Array<{ file: string, line?: number, kind?: string, value?: string, reason?: string }> }}
 */
export function loadExceptions() {
  if (!fs.existsSync(EXCEPTIONS_PATH)) return { allow: [] }
  try {
    return JSON.parse(fs.readFileSync(EXCEPTIONS_PATH, 'utf8'))
  } catch {
    return { allow: [] }
  }
}

/**
 * @param {Finding} f
 * @param {ReturnType<typeof loadExceptions>} exceptions
 */
export function isExcepted(f, exceptions) {
  return (exceptions.allow ?? []).some((e) => {
    if (e.file && e.file !== f.file) return false
    if (e.kind && e.kind !== f.kind) return false
    if (e.value && e.value !== f.value) return false
    if (typeof e.line === 'number' && e.line !== f.line) return false
    // file-only allow: whole file for that kind (or any kind if kind omitted)
    return true
  })
}

/**
 * @param {Finding[]} findings
 * @param {ReturnType<typeof loadExceptions>} exceptions
 */
export function filterActionable(findings, exceptions = loadExceptions()) {
  return findings.filter((f) => !isExcepted(f, exceptions))
}

export function summarize(findings) {
  const byKind = {}
  for (const f of findings) {
    byKind[f.kind] = (byKind[f.kind] ?? 0) + 1
  }
  return { total: findings.length, byKind, files: new Set(findings.map((f) => f.file)).size }
}

function main() {
  const args = new Set(process.argv.slice(2))
  const findings = scanRepo()
  const exceptions = loadExceptions()
  const actionable = filterActionable(findings, exceptions)
  const summary = summarize(findings)
  const actionSummary = summarize(actionable)

  if (args.has('--json')) {
    process.stdout.write(
      JSON.stringify(
        { summary, actionSummary, findings: actionable, allCount: findings.length },
        null,
        2,
      ),
    )
    process.stdout.write('\n')
  } else {
    console.log(
      `[audit-design-tokens] raw=${summary.total} actionable=${actionSummary.total} files=${summary.files}`,
    )
    console.log(`[audit-design-tokens] byKind raw=`, summary.byKind)
    console.log(`[audit-design-tokens] byKind actionable=`, actionSummary.byKind)
    const preview = actionable.slice(0, 40)
    for (const f of preview) {
      console.log(`  ${f.kind} ${f.file}:${f.line} ${f.value}  | ${f.snippet}`)
    }
    if (actionable.length > preview.length) {
      console.log(`  … +${actionable.length - preview.length} more`)
    }
  }

  if (args.has('--check') && actionable.length > 0) {
    process.exitCode = 1
  }
}

const isDirect =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirect) {
  main()
}
