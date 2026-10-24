// Redraws every example in skills/architecture-diagram/examples as SVG and PNG.
// Run `npm install` first (the PNG step uses @resvg/resvg-js).
import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const skill = join(root, 'skills', 'architecture-diagram')
const check = process.argv.includes('--check')
for (const name of readdirSync(join(skill, 'examples')).filter((f) => f.endsWith('.json')).sort()) {
  const args = [join(skill, 'scripts', 'render.mjs'), join(skill, 'examples', name), ...(check ? ['--check'] : ['--png', '--no-system-fonts'])]
  execFileSync(process.execPath, args, { stdio: 'inherit' })
}
