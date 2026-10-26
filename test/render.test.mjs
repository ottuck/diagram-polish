// Runs render.mjs as a command, the way a user does, and checks exit codes, messages and files.
// Run with `npm test` (Node's built-in test runner, nothing to install).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const examples = join(root, 'skills', 'architecture-diagram', 'examples')
const script = join(root, 'skills', 'architecture-diagram', 'scripts', 'render.mjs')
const scratch = mkdtempSync(join(tmpdir(), 'diagram-polish-'))

const run = (...args) => {
  const r = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' })
  return { code: r.status, out: r.stdout + r.stderr }
}

let count = 0
const write = (diagram) => {
  const file = join(scratch, `d${count++}.json`)
  writeFileSync(file, JSON.stringify(diagram))
  return file
}

const node = (id, x, y = 100) => ({ id, x, y, title: id })
const diagram = (nodes, edges, extra = {}) => ({ width: 900, height: 200, summary: 'A test diagram.', nodes, edges, ...extra })
const row = [node('a', 150), node('b', 450), node('c', 750)]

const jsonFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? jsonFiles(join(dir, e.name)) : e.name.endsWith('.json') ? [join(dir, e.name)] : []))

test('every example passes --check --strict', () => {
  for (const file of jsonFiles(examples)) {
    const r = run(file, '--check', '--strict')
    assert.equal(r.code, 0, `${basename(file)}:\n${r.out}`)
  }
})

test('every example redraws to the SVG that is committed', () => {
  for (const file of jsonFiles(examples)) {
    const out = join(scratch, basename(file, '.json') + '.svg')
    assert.equal(run(file, '--out', out).code, 0, basename(file))
    const committed = join(dirname(file), basename(file, '.json') + '.svg')
    assert.equal(readFileSync(out, 'utf8'), readFileSync(committed, 'utf8'), `${basename(file)}.svg is out of date; run npm run examples`)
  }
})

test('bad input stops with an error and exit code 1', () => {
  const missing = run(write({ width: 900, height: 200, nodes: row, edges: [] }), '--check')
  assert.equal(missing.code, 1)
  assert.match(missing.out, /"summary"/)

  const unknown = run(write(diagram(row, [{ from: 'a', to: 'zzz' }])), '--check')
  assert.equal(unknown.code, 1)
  assert.match(unknown.out, /no box with that id/)

  const route = run(write(diagram(row, [{ from: 'a', to: 'b', route: 'zigzag' }])), '--check')
  assert.equal(route.code, 1)
  assert.match(route.out, /route must be one of/)

  const duplicate = run(write(diagram([node('a', 150), node('a', 450)], [])), '--check')
  assert.equal(duplicate.code, 1)
  assert.match(duplicate.out, /duplicate id/)

  assert.equal(run(write(diagram(row, [], { theme: 'neon' })), '--check').code, 1)
  assert.equal(run(join(scratch, 'does-not-exist.json')).code, 1)
})

test('a clean diagram has no warnings', () => {
  const r = run(write(diagram(row, [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }])), '--check', '--strict')
  assert.equal(r.code, 0, r.out)
  assert.match(r.out, /No problems found/)
})

test('a line through a box is a warning, and --strict turns it into exit code 1', () => {
  const file = write(diagram(row, [{ from: 'a', to: 'c' }]))
  const plain = run(file, '--check')
  assert.equal(plain.code, 0)
  assert.match(plain.out, /passes through box "b"/)
  assert.equal(run(file, '--check', '--strict').code, 1)
})

test('lines that run along the same path are a warning', () => {
  const file = write(diagram(row, [{ from: 'a', to: 'b' }, { from: 'a', to: 'c' }]))
  const r = run(file, '--check')
  assert.match(r.out, /a → b and a → c run along the same path/)
  assert.equal(run(file, '--check', '--strict').code, 1)
})

test('lines that only cross, or sit apart, are not reported as overlapping', () => {
  const file = write(diagram([node('a', 150, 60), node('b', 750, 60), node('c', 450, 20), node('d', 450, 160)], [{ from: 'a', to: 'b', route: 'h', offset: 0 }, { from: 'c', to: 'd', route: 'v' }], { height: 200 }))
  assert.doesNotMatch(run(file, '--check').out, /same path/)
})

test('--strict on a render still writes the files, then exits with 1', () => {
  const file = write(diagram(row, [{ from: 'a', to: 'c' }]))
  const out = join(scratch, 'strict.svg')
  const r = run(file, '--out', out, '--strict')
  assert.equal(r.code, 1)
  assert.match(readFileSync(out, 'utf8'), /^<svg /)
})

test('render writes an accessible SVG, and the dark, both and auto modes', () => {
  const file = write(diagram(row, [{ from: 'a', to: 'b', label: 'Go' }], { title: 'Test app' }))
  const out = join(scratch, 'modes.svg')
  assert.equal(run(file, '--out', out).code, 0)
  const svg = readFileSync(out, 'utf8')
  assert.match(svg, /<title id="title">Test app — Architecture<\/title>/)
  assert.match(svg, /<desc id="desc">A test diagram\.<\/desc>/)

  assert.equal(run(file, '--out', out, '--both').code, 0)
  assert.notEqual(readFileSync(join(scratch, 'modes-dark.svg'), 'utf8'), readFileSync(out, 'utf8'))

  assert.equal(run(file, '--out', join(scratch, 'auto.svg'), '--auto').code, 0)
  assert.match(readFileSync(join(scratch, 'auto.svg'), 'utf8'), /prefers-color-scheme: dark/)
  assert.equal(run(file, '--auto', '--dark').code, 1)
})

test('--check writes no files', () => {
  const file = write(diagram(row, [{ from: 'a', to: 'b' }]))
  const before = readdirSync(scratch).length
  run(file, '--check')
  assert.equal(readdirSync(scratch).length, before)
})
