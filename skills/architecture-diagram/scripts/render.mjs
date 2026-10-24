#!/usr/bin/env node
// Draws a diagram.json as a standalone SVG, and optionally as a 2x PNG.
//
//   node render.mjs <diagram.json> [--out <file.svg>] [--png] [--title <name>] [--font-dir <dir>] [--check]
//
// The SVG needs no dependencies. --png needs @resvg/resvg-js (npm i -D @resvg/resvg-js) and uses the
// Geist fonts in ../fonts unless --font-dir says otherwise. --check validates and prints warnings only.
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

// ---- Palette (light). A diagram can override single entries with a top-level "colors" object.
const defaultColors = {
  background: '#fdfdfb',
  group: { fill: '#faf7f1', stroke: '#ebe3d6', title: '#71675e' },
  main: { fill: '#edf5ee', stroke: '#c8d8cb', title: '#344c3b', note: '#5e6f5c' },
  accent: { fill: '#fbf4e6', stroke: '#ddcfb4', title: '#6f5a39', note: '#806a47' },
  outside: { fill: '#f3ece1', stroke: '#e0d6c6', title: '#231d18', note: '#6b6158' },
  solid: { line: '#8c9c90', fill: '#f5f9f5', stroke: '#d8e4d9', text: '#4c6050' },
  dashed: { line: '#b49b72', fill: '#fbf7ef', stroke: '#e5d9c4', text: '#7d6643' },
}
const mergeColors = (override = {}) =>
  Object.fromEntries(Object.entries(defaultColors).map(([key, value]) => [key, typeof value === 'string' ? (override[key] ?? value) : { ...value, ...(override[key] ?? {}) }]))

// ---- Layout. Font sizes are in diagram units.
const TEXT = { title: 15, note: 12, label: 12 }

// Hangul, CJK and full-width forms take a full em.
const wide = (c) => {
  const n = c.codePointAt(0)
  return (n >= 0x1100 && n <= 0x11ff) || (n >= 0x3000 && n <= 0x9fff) || (n >= 0xac00 && n <= 0xd7af) || (n >= 0xff00 && n <= 0xffef)
}
const narrow = /[\s·.,:;'()/|\-→+&]/

// A rough width for Geist text, so boxes and labels fit their words in any language.
function textWidth(text, size) {
  let em = 0
  for (const c of text) em += wide(c) ? 1 : narrow.test(c) ? 0.32 : /[A-Z0-9]/.test(c) ? 0.64 : 0.55
  return em * size
}

function box(n) {
  const text = Math.max(textWidth(n.title, TEXT.title) * 1.05, n.note ? textWidth(n.note, TEXT.note) : 0)
  const w = Math.max(120, Math.ceil(text) + 40)
  const h = n.note ? 68 : 52
  return { ...n, w, h, x0: n.x - w / 2, y0: n.y - h / 2 }
}

const overlaps = (a0, a1, b0, b1) => a0 < b1 && b0 < a1

function points(e, a, b) {
  const route = e.route ?? (overlaps(a.y0, a.y0 + a.h, b.y0, b.y0 + b.h) ? 'h' : overlaps(a.x0, a.x0 + a.w, b.x0, b.x0 + b.w) ? 'v' : 'hvh')
  const dx = Math.sign(b.x - a.x) || 1
  const dy = Math.sign(b.y - a.y) || 1
  const from = e.fromOffset ?? 0
  const to = e.toOffset ?? 0
  switch (route) {
    case 'h': {
      const y = (a.y + b.y) / 2 + (e.offset ?? 0)
      return [[a.x + (dx * a.w) / 2, y], [b.x - (dx * b.w) / 2, y]]
    }
    case 'v': {
      const x = (a.x + b.x) / 2 + (e.offset ?? 0)
      return [[x, a.y + (dy * a.h) / 2], [x, b.y - (dy * b.h) / 2]]
    }
    case 'hvh': {
      const x1 = a.x + (dx * a.w) / 2
      const x2 = b.x - (dx * b.w) / 2
      const m = e.bend ?? (x1 + x2) / 2
      return [[x1, a.y + from], [m, a.y + from], [m, b.y + to], [x2, b.y + to]]
    }
    case 'vhv': {
      const y1 = a.y + (dy * a.h) / 2
      const y2 = b.y - (dy * b.h) / 2
      const m = e.bend ?? (y1 + y2) / 2
      return [[a.x + from, y1], [a.x + from, m], [b.x + to, m], [b.x + to, y2]]
    }
    case 'hv': {
      const y = a.y + from
      const x = b.x + to
      const down = Math.sign(b.y - y) || 1
      return [[a.x + (dx * a.w) / 2, y], [x, y], [x, b.y - (down * b.h) / 2]]
    }
    case 'vh': {
      const x = a.x + from
      const y = b.y + to
      const right = Math.sign(b.x - x) || 1
      return [[x, a.y + (dy * a.h) / 2], [x, y], [b.x - (right * b.w) / 2, y]]
    }
  }
}

const round = (n) => Math.round(n * 10) / 10

// Straight runs joined by small rounded corners.
function path(p) {
  let d = `M${round(p[0][0])} ${round(p[0][1])}`
  for (let i = 1; i < p.length - 1; i++) {
    const [px, py] = p[i - 1]
    const [x, y] = p[i]
    const [nx, ny] = p[i + 1]
    const r = Math.min(12, Math.hypot(x - px, y - py) / 2, Math.hypot(nx - x, ny - y) / 2)
    d += ` L${round(x - Math.sign(x - px) * r)} ${round(y - Math.sign(y - py) * r)} Q${round(x)} ${round(y)} ${round(x + Math.sign(nx - x) * r)} ${round(y + Math.sign(ny - y) * r)}`
  }
  const [lx, ly] = p[p.length - 1]
  return `${d} L${round(lx)} ${round(ly)}`
}

function layoutDiagram(d) {
  const boxes = new Map(d.nodes.map((n) => [n.id, box(n)]))
  const edges = d.edges.map((e) => {
    const p = points(e, boxes.get(e.from), boxes.get(e.to))
    const segments = p.slice(1).map((q, i) => [p[i], q])
    const length = ([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1])
    const at = e.labelAt ?? segments.reduce((best, s, i) => (length(s) > length(segments[best]) ? i : best), 0)
    const [a, b] = segments[at] ?? segments[0]
    const label = e.label && {
      text: e.label,
      x: round((a[0] + b[0]) / 2),
      y: round((a[1] + b[1]) / 2),
      w: Math.ceil(textWidth(e.label, TEXT.label)) + 22,
    }
    return { from: e.from, to: e.to, points: p, d: path(p), dashed: Boolean(e.dashed), both: Boolean(e.both), label: label || undefined }
  })
  return { boxes: [...boxes.values()], edges }
}

// ---- Checks. Errors stop the render; warnings print what to look at in the picture.
const ROUTES = ['h', 'v', 'hvh', 'vhv', 'hv', 'vh']
const TONES = ['main', 'accent', 'outside']

function validate(d) {
  const errors = []
  const isNum = (v) => typeof v === 'number' && Number.isFinite(v)
  if (!isNum(d.width) || !isNum(d.height)) errors.push('"width" and "height" must be numbers')
  if (typeof d.summary !== 'string' || !d.summary.trim()) errors.push('"summary" must be a sentence or two')
  if (!Array.isArray(d.nodes) || !d.nodes.length) errors.push('"nodes" must be a non-empty array')
  if (!Array.isArray(d.edges)) errors.push('"edges" must be an array')
  if (errors.length) return { errors, warnings: [] }

  const ids = new Set()
  for (const [i, n] of d.nodes.entries()) {
    const at = `nodes[${i}]${n.id ? ` (${n.id})` : ''}`
    if (!n.id || typeof n.id !== 'string') errors.push(`${at}: "id" is required`)
    else if (ids.has(n.id)) errors.push(`${at}: duplicate id`)
    ids.add(n.id)
    if (!isNum(n.x) || !isNum(n.y)) errors.push(`${at}: "x" and "y" (the box centre) must be numbers`)
    if (typeof n.title !== 'string' || !n.title) errors.push(`${at}: "title" is required`)
    if (n.tone && !TONES.includes(n.tone)) errors.push(`${at}: tone must be one of ${TONES.join(', ')}`)
  }
  for (const [i, e] of d.edges.entries()) {
    const at = `edges[${i}] (${e.from} → ${e.to})`
    if (!ids.has(e.from) || !ids.has(e.to)) errors.push(`${at}: no box with that id`)
    if (e.route && !ROUTES.includes(e.route)) errors.push(`${at}: route must be one of ${ROUTES.join(', ')}`)
  }
  for (const [i, g] of (d.groups ?? []).entries()) {
    if (![g.x, g.y, g.w, g.h].every(isNum) || typeof g.title !== 'string') errors.push(`groups[${i}]: needs title, x, y, w, h (x and y are the top-left corner)`)
  }
  if (errors.length) return { errors, warnings: [] }

  const warnings = []
  const { boxes, edges } = layoutDiagram(d)
  const rect = (b) => ({ x0: b.x0, y0: b.y0, x1: b.x0 + b.w, y1: b.y0 + b.h })
  const hit = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
  for (const b of boxes) {
    const r = rect(b)
    if (r.x0 < 10 || r.y0 < 10 || r.x1 > d.width - 10 || r.y1 > d.height - 10) warnings.push(`box "${b.id}" is cut off or touches the edge (it spans x ${Math.round(r.x0)}–${Math.round(r.x1)}, y ${Math.round(r.y0)}–${Math.round(r.y1)} on a ${d.width}×${d.height} canvas)`)
  }
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) if (hit(rect(boxes[i]), rect(boxes[j]))) warnings.push(`boxes "${boxes[i].id}" and "${boxes[j].id}" overlap`)
  for (const g of d.groups ?? []) {
    const gr = { x0: g.x, y0: g.y, x1: g.x + g.w, y1: g.y + g.h }
    for (const b of boxes) {
      const r = rect(b)
      const inside = r.x0 >= gr.x0 && r.x1 <= gr.x1 && r.y0 >= gr.y0 && r.y1 <= gr.y1
      if (hit(r, gr) && !inside) warnings.push(`box "${b.id}" crosses the edge of group "${g.title}"`)
      const title = { x0: g.x + 14, y0: g.y + 8, x1: g.x + 14 + textWidth(g.title, 12), y1: g.y + 26 }
      if (inside && hit(r, title)) warnings.push(`box "${b.id}" covers the title of group "${g.title}"`)
    }
  }
  // A line crossing a box it neither starts nor ends at.
  for (const e of edges) {
    for (let k = 1; k < e.points.length; k++) {
      const [a, b] = [e.points[k - 1], e.points[k]]
      const seg = { x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]), y0: Math.min(a[1], b[1]), y1: Math.max(a[1], b[1]) }
      for (const bx of boxes) {
        if (bx.id === e.from || bx.id === e.to) continue
        const r = rect(bx)
        if (seg.x0 < r.x1 - 1 && r.x0 + 1 < seg.x1 + 0.01 && seg.y0 < r.y1 - 1 && r.y0 + 1 < seg.y1 + 0.01) warnings.push(`the line ${e.from} → ${e.to} passes through box "${bx.id}"`)
      }
    }
  }
  const pills = edges.filter((e) => e.label).map((e) => ({ id: `${e.from} → ${e.to}`, x0: e.label.x - e.label.w / 2, x1: e.label.x + e.label.w / 2, y0: e.label.y - 11, y1: e.label.y + 11 }))
  for (const p of pills) for (const b of boxes) if (hit(p, rect(b))) warnings.push(`the label on ${p.id} touches box "${b.id}"`)
  for (let i = 0; i < pills.length; i++) for (let j = i + 1; j < pills.length; j++) if (hit(pills[i], pills[j])) warnings.push(`the labels on ${pills[i].id} and ${pills[j].id} overlap`)
  return { errors, warnings: [...new Set(warnings)] }
}

// ---- SVG
const xml = (text) => text.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c])

function svg(name, d) {
  const color = mergeColors(d.colors)
  const { boxes, edges } = layoutDiagram(d)
  // Separate start and end heads: resvg doesn't support orient="auto-start-reverse".
  const marker = (id, stroke) =>
    [['', 'M1 1 L7 4 L1 7', 7], ['-start', 'M7 1 L1 4 L7 7', 1]]
      .map(([suffix, shape, refX]) => `<marker id="${id}${suffix}" viewBox="0 0 8 8" refX="${refX}" refY="4" markerWidth="7" markerHeight="7" orient="auto" overflow="visible"><path d="${shape}" fill="none" stroke="${stroke}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></marker>`)
      .join('')
  const groups = (d.groups ?? []).map((g) => `<rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="18" fill="${color.group.fill}" stroke="${color.group.stroke}" stroke-dasharray="5 5"/><text x="${g.x + 14}" y="${g.y + 20}" font-size="12" fill="${color.group.title}">${xml(g.title)}</text>`)
  const lines = edges.map((e) => {
    const kind = e.dashed ? 'dashed' : 'solid'
    return `<path d="${e.d}" fill="none" stroke="${color[kind].line}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"${e.dashed ? ' stroke-dasharray="4 5"' : ''} marker-end="url(#${kind})"${e.both ? ` marker-start="url(#${kind}-start)"` : ''}/>`
  })
  const nodes = boxes.map((b) => {
    const c = color[b.tone ?? 'main']
    return [
      `<rect x="${b.x0}" y="${b.y0}" width="${b.w}" height="${b.h}" rx="16" fill="${c.fill}" stroke="${c.stroke}"/>`,
      `<text x="${b.x}" y="${b.note ? b.y - 5 : b.y + 5}" font-size="${TEXT.title}" font-weight="600" fill="${c.title}">${xml(b.title)}</text>`,
      b.note ? `<text x="${b.x}" y="${b.y + 16}" font-size="${TEXT.note}" fill="${c.note}">${xml(b.note)}</text>` : '',
    ].join('')
  })
  const labels = edges.flatMap((e) => {
    if (!e.label) return []
    const c = color[e.dashed ? 'dashed' : 'solid']
    return [`<rect x="${e.label.x - e.label.w / 2}" y="${e.label.y - 11}" width="${e.label.w}" height="22" rx="11" fill="${c.fill}" stroke="${c.stroke}"/><text x="${e.label.x}" y="${e.label.y + 4}" font-size="${TEXT.label}" fill="${c.text}">${xml(e.label.text)}</text>`]
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${d.width}" height="${d.height}" viewBox="0 0 ${d.width} ${d.height}" role="img" aria-labelledby="title desc">
  <title id="title">${xml(name)} — Architecture</title>
  <desc id="desc">${xml(d.summary)}</desc>
  <defs>${marker('solid', color.solid.line)}${marker('dashed', color.dashed.line)}</defs>
  <rect width="${d.width}" height="${d.height}" rx="20" fill="${color.background}"/>
  <g font-family="Geist, Arial, Helvetica, sans-serif">${groups.join('')}${lines.join('')}<g text-anchor="middle">${nodes.join('')}${labels.join('')}</g></g>
</svg>
`
}

// ---- PNG (optional)
async function loadResvg() {
  try {
    return await import('@resvg/resvg-js')
  } catch {
    try {
      return createRequire(join(process.cwd(), 'noop.js'))('@resvg/resvg-js')
    } catch {
      throw new Error('--png needs @resvg/resvg-js. Run `npm i -D @resvg/resvg-js` in the folder you run this from, or open the SVG in a browser instead.')
    }
  }
}

async function png(text, fontDir) {
  const { Resvg } = await loadResvg()
  const files = existsSync(fontDir) ? (await readdir(fontDir)).filter((f) => f.endsWith('.ttf')).map((f) => join(fontDir, f)) : []
  return new Resvg(text, { fitTo: { mode: 'zoom', value: 2 }, font: { fontFiles: files, loadSystemFonts: files.length === 0, defaultFontFamily: 'Geist' } }).render().asPng()
}

// ---- CLI
const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined)
const input = args.find((a, i) => !a.startsWith('--') && !['--out', '--title', '--font-dir'].includes(args[i - 1]))
if (!input || flag('--help')) {
  console.log('Usage: node render.mjs <diagram.json> [--out <file.svg>] [--png] [--title <name>] [--font-dir <dir>] [--check]')
  process.exit(input ? 0 : 1)
}

let diagram
try {
  diagram = JSON.parse(await readFile(resolve(input), 'utf8'))
} catch (error) {
  console.error(`Could not read ${input}: ${error.message}`)
  process.exit(1)
}
const { errors, warnings } = validate(diagram)
for (const e of errors) console.error(`error: ${e}`)
for (const w of warnings) console.warn(`warning: ${w}`)
if (errors.length) process.exit(1)
if (flag('--check')) {
  console.log(warnings.length ? `${warnings.length} warning(s).` : 'No problems found.')
  process.exit(0)
}

const name = option('--title') ?? diagram.title ?? basename(input, extname(input))
const out = resolve(option('--out') ?? `${input.replace(/\.json$/i, '')}.svg`)
const text = svg(name, diagram)
await writeFile(out, text)
console.log(`Wrote ${out}`)
if (flag('--png')) {
  const pngPath = out.replace(/\.svg$/i, '') + '.png'
  await writeFile(pngPath, await png(text, resolve(option('--font-dir') ?? join(here, '..', 'fonts'))))
  console.log(`Wrote ${pngPath} (2x)`)
}
if (warnings.length) console.log(`${warnings.length} warning(s): look at the picture before you keep it.`)
