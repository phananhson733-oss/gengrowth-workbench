#!/usr/bin/env node
// Packs one plugin package the way it will be installed and checks the tarball
// instead of the source tree: an entry missing from `files` only shows up after
// packing.
//
//   node scripts/pack-plugin.mjs [plugin|plugin-pick]
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PLUGINS = ['plugin', 'plugin-pick']
const dir = process.argv[2] ?? 'plugin'
if (!PLUGINS.includes(dir)) {
  console.error(`Unknown plugin directory "${dir}". Expected one of: ${PLUGINS.join(', ')}.`)
  process.exit(1)
}
const pluginRoot = path.join(repoRoot, dir)
// Each package has its own output directory, so packing one never removes the other's tarball.
const outDir = path.join(repoRoot, dir === 'plugin' ? '.dev/dist' : `.dev/dist-${dir}`)
const pkg = JSON.parse(await readFile(path.join(pluginRoot, 'package.json'), 'utf8'))
// plugin/ lists its generated content in a manifest; a package without one ships hand-written skills.
const manifest = await readFile(path.join(pluginRoot, 'content.manifest.json'), 'utf8').then(JSON.parse, (error) => {
  if (error?.code === 'ENOENT') return null
  throw error
})
const skillFiles = manifest ? [] : (await readdir(path.join(pluginRoot, 'skills'), { withFileTypes: true }))
  .filter(entry => entry.isDirectory()).map(entry => `skills/${entry.name}/SKILL.md`)

await rm(outDir, { recursive: true, force: true })
await mkdir(outDir, { recursive: true })
execFileSync('pnpm', ['pack', '--pack-destination', outDir], { cwd: pluginRoot, stdio: ['ignore', 'ignore', 'inherit'] })
const tarball = path.join(outDir, `${pkg.name}-${pkg.version}.tgz`)
const listed = execFileSync('tar', ['-tzf', tarball], { encoding: 'utf8' }).trim().split('\n').map(entry => entry.replace(/^package\//, ''))

const required = [
  'package.json',
  pkg.exports['.'], pkg.exports['./client'], pkg.dsh.bundle.patch,
  ...(manifest ? ['content.manifest.json', ...manifest.entries.map(entry => entry.file)] : skillFiles),
].map(entry => entry.replace(/^\.\//, ''))
const missing = required.filter(entry => !listed.includes(entry))
// Nothing that can hold a secret or local state belongs in an installable package.
const forbidden = listed.filter(entry => /(^|\/)(\.env|api\.json|node_modules\/|\.dev\/)|\.(pem|key)$/.test(entry) || entry.startsWith('test/'))
if (missing.length || forbidden.length) {
  if (missing.length) console.error(`Missing from the tarball:\n  ${missing.join('\n  ')}`)
  if (forbidden.length) console.error(`Must not be in the tarball:\n  ${forbidden.join('\n  ')}`)
  process.exit(1)
}
const bytes = await readFile(tarball)
console.log(JSON.stringify({
  tarball: path.relative(repoRoot, tarball),
  files: listed.length,
  bytes: bytes.length,
  sha256: createHash('sha256').update(bytes).digest('hex'),
}, null, 2))
