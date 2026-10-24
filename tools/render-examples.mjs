// Redraws every example under skills/architecture-diagram/examples (including from-mermaid/) as SVG and PNG.
// Run `npm install` first (the PNG step uses @resvg/resvg-js). With --check it only validates.
import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const skill = join(root, 'skills', 'architecture-diagram')
const check = process.argv.includes('--check')

const jsonFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => (entry.isDirectory() ? jsonFiles(join(dir, entry.name)) : entry.name.endsWith('.json') ? [join(dir, entry.name)] : []))

for (const file of jsonFiles(join(skill, 'examples'))) {
  const args = [join(skill, 'scripts', 'render.mjs'), file, ...(check ? ['--check'] : ['--png', '--no-system-fonts'])]
  execFileSync(process.execPath, args, { stdio: 'inherit' })
}
