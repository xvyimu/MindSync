/**
 * One-shot R5 codemod: normalize illegal spacing/font px toward constitution.
 * Idempotent for already-legal values. Review git diff before commit.
 *
 *   node packages/ui/scripts/normalize-design-tokens.mjs
 *   node packages/ui/scripts/normalize-design-tokens.mjs --dry
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC_ROOT = path.resolve(__dirname, '../src')

const dry = process.argv.includes('--dry')

/**
 * Map a single px token that appears in multi-value margin/padding/gap.
 * @param {string} token e.g. "12px" or "0"
 */
function mapSpaceToken(token) {
  if (token === '0' || token === '0px') return token
  const m = token.match(/^(\d+(?:\.\d+)?)px$/)
  if (!m) return token
  const n = Number(m[1])
  const table = {
    3: 4,
    5: 4,
    6: 4,
    7: 8,
    9: 8,
    10: 8,
    11: 8,
    12: 8,
    13: 16,
    14: 16,
    18: 16,
    20: 16,
    22: 24,
    28: 32,
    36: 32,
    40: 32,
  }
  if (table[n] != null) return `${table[n]}px`
  // large footer padding → clamp to 32
  if (n > 32 && n <= 100) return '32px'
  return token
}

/**
 * Normalize multi-value margin/padding declarations (up to 4 tokens).
 * @param {string} content
 */
function normalizeMultiValueBox(content) {
  return content.replace(
    /\b(margin|padding|gap|row-gap|column-gap)(\s*:\s*)([^;'"}\n]+)/gi,
    (full, prop, sep, vals) => {
      // skip if contains var( or calc(
      if (/\b(var|calc)\s*\(/.test(vals)) return full
      const tokens = vals.trim().split(/\s+/).filter(Boolean)
      if (tokens.length === 0 || tokens.length > 4) return full
      if (!tokens.every((t) => t === '0' || /^\d+(?:\.\d+)?px$/.test(t))) return full
      const mapped = tokens.map(mapSpaceToken)
      if (mapped.join(' ') === tokens.join(' ')) return full
      return `${prop}${sep}${mapped.join(' ')}`
    },
  )
}

/**
 * Normalize longhand margin/padding side props not caught by multi pass.
 * @param {string} content
 */
function normalizeLonghand(content) {
  return content.replace(
    /\b(margin|padding)-(top|right|bottom|left)(\s*:\s*)(\d+(?:\.\d+)?)px\b/gi,
    (full, prop, side, sep, num) => {
      const mapped = mapSpaceToken(`${num}px`)
      if (mapped === `${num}px`) return full
      return `${prop}-${side}${sep}${mapped}`
    },
  )
}

/** @type {Array<[RegExp, string]>} */
const RULES = [
  // Naive size prop often uses px steps
  [/:size="12"/g, ':size="8"'],
  [/:size='12'/g, ":size='8'"],
  [/size:\s*12([,\s}])/g, 'size: 8$1'],

  // style object camelCase single values
  [/paddingRight:\s*['"]12px['"]/g, "paddingRight: '8px'"],
  [/paddingLeft:\s*['"]12px['"]/g, "paddingLeft: '8px'"],
  [/paddingTop:\s*['"]12px['"]/g, "paddingTop: '8px'"],
  [/paddingBottom:\s*['"]12px['"]/g, "paddingBottom: '8px'"],
  [/marginTop:\s*['"]12px['"]/g, "marginTop: '8px'"],
  [/marginBottom:\s*['"]12px['"]/g, "marginBottom: '8px'"],
  [/marginLeft:\s*['"]12px['"]/g, "marginLeft: '8px'"],
  [/marginRight:\s*['"]12px['"]/g, "marginRight: '8px'"],
  [/gap:\s*['"]12px['"]/g, "gap: '8px'"],
  [/gap:\s*['"]6px['"]/g, "gap: '4px'"],
  [/padding:\s*['"]12px['"]/g, "padding: '8px'"],
  [/margin:\s*['"]12px['"]/g, "margin: '8px'"],

  // --- fonts (body scale only; decorative sizes left for exceptions) ---
  [/\bfont-size:\s*10px\b/g, 'font-size: 12px'],
  [/\bfont-size:\s*11px\b/g, 'font-size: 12px'],
  [/\bfont-size:\s*13px\b/g, 'font-size: 12px'],
  [/\bfont-size:\s*15px\b/g, 'font-size: 16px'],
  [/\bfont-size:\s*17px\b/g, 'font-size: 16px'],
  [/\bfont-size:\s*19px\b/g, 'font-size: 18px'],
  [/\bfont-size:\s*20px\b/g, 'font-size: 18px'],
  [/\bfont-size:\s*22px\b/g, 'font-size: 18px'],
  [/fontSize:\s*['"]10px['"]/g, "fontSize: '12px'"],
  [/fontSize:\s*['"]11px['"]/g, "fontSize: '12px'"],
  [/fontSize:\s*['"]13px['"]/g, "fontSize: '12px'"],
  [/fontSize:\s*['"]17px['"]/g, "fontSize: '16px'"],
  [/fontSize:\s*['"]22px['"]/g, "fontSize: '18px'"],
]

/**
 * @param {string} dir
 * @param {string[]} acc
 */
function walk(dir, acc) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === 'dist') continue
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(full, acc)
    else if (/\.(vue|css|ts)$/.test(ent.name)) acc.push(full)
  }
}

function transform(content) {
  let next = content
  let hits = 0
  const beforeMulti = next
  next = normalizeMultiValueBox(next)
  next = normalizeLonghand(next)
  if (next !== beforeMulti) hits += 1
  for (const [re, rep] of RULES) {
    const before = next
    next = next.replace(re, rep)
    if (next !== before) {
      const m = before.match(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'))
      hits += m ? m.length : 1
    }
  }
  return { next, hits }
}

const files = []
walk(SRC_ROOT, files)
let changedFiles = 0
let totalHits = 0

for (const full of files) {
  const raw = fs.readFileSync(full, 'utf8')
  const { next, hits } = transform(raw)
  if (hits === 0 || next === raw) continue
  changedFiles++
  totalHits += hits
  const rel = path.relative(path.resolve(__dirname, '..'), full).replace(/\\/g, '/')
  console.log(`${dry ? 'DRY ' : ''}${rel} (~${hits} rule hits)`)
  if (!dry) fs.writeFileSync(full, next, 'utf8')
}

console.log(`[normalize] files=${changedFiles} approxHits=${totalHits} dry=${dry}`)
