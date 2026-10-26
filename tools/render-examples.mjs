// Redraws every example under skills/architecture-diagram/examples (including from-mermaid/) as SVG and PNG.
// Run `npm install` first (the PNG step uses @resvg/resvg-js). With --check it only validates and fails on any warning.
import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const skill = join(root, 'skills', 'architecture-diagram')
const check = process.argv.includes('--check')

const jsonFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => (entry.isDirectory() ? jsonFiles(join(dir, entry.name)) : entry.name.endsWith('.json') ? [join(dir, entry.name)] : []))

// Most examples are drawn in light only; these three also get a dark version, and the starter an --auto SVG.
const withDark = new Set(['starter', 'starter-blue', 'data-pipeline'])
const render = (...args) => execFileSync(process.execPath, [join(skill, 'scripts', 'render.mjs'), ...args], { stdio: 'inherit' })

for (const file of jsonFiles(join(skill, 'examples'))) {
  const name = basename(file, '.json')
  if (check) render(file, '--check', '--strict')
  else render(file, withDark.has(name) ? '--both' : '--png', ...(withDark.has(name) ? ['--png'] : []), '--no-system-fonts')
  if (!check && name === 'starter') render(file, '--auto', '--out', join(dirname(file), 'starter-auto.svg'))
}
