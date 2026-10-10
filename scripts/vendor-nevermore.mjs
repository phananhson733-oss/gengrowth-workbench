#!/usr/bin/env node
// Copies engine code out of a nevermore checkout, byte for byte.
//
// Only the import closure of the entries in vendor/nevermore.entries.json is
// copied, at the same paths and under the same `@sf/*` package names, so no
// source file has to be edited and a later re-sync is a plain overwrite. What
// is generated here is each package.json (trimmed to the copied files) and
// PROVENANCE.json (source commit and a hash per file).
//
//   NEVERMORE_DIR=<checkout> node scripts/vendor-nevermore.mjs [--check]
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const vendorRoot = path.join(repoRoot, 'vendor/nevermore')
const args = process.argv.slice(2)
const option = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
const source = option('--from') ?? process.env.NEVERMORE_DIR
const check = args.includes('--check')
if (!source) {
  console.error('Set NEVERMORE_DIR (or pass --from) to a nevermore checkout.')
  process.exit(2)
}
const config = JSON.parse(await readFile(path.join(repoRoot, 'vendor/nevermore.entries.json'), 'utf8'))
const git = (...argv) => execFileSync('git', ['-C', source, ...argv], { encoding: 'utf8' }).trim()
const commit = git('rev-parse', 'HEAD')
if (git('status', '--porcelain', '--', 'packages')) {
  console.error('nevermore packages/ has uncommitted changes; vendor from a clean checkout so the recorded commit is true.')
  process.exit(1)
}

// Workspace packages by name, read from the checkout itself.
const workspace = new Map()
for (const dir of await readdir(path.join(source, 'packages'))) {
  const manifestPath = path.join(source, 'packages', dir, 'package.json')
  if (!existsSync(manifestPath)) continue
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  workspace.set(manifest.name, { dir: `packages/${dir}`, manifest })
}
const catalogText = readFileSync(path.join(source, 'pnpm-workspace.yaml'), 'utf8')
const catalogVersion = (name) => {
  const escaped = name.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
  return new RegExp(`^\\s+'?${escaped}'?:\\s*(\\S+)\\s*$`, 'm').exec(catalogText)?.[1]
}

function packageOf(specifier) {
  for (const name of workspace.keys()) {
    if (specifier === name || specifier.startsWith(`${name}/`)) return { name, subpath: specifier === name ? '.' : `./${specifier.slice(name.length + 1)}` }
  }
  return null
}
function fileFor(candidate) {
  for (const option of [candidate, `${candidate}.ts`, `${candidate}.tsx`, path.join(candidate, 'index.ts')]) {
    if (existsSync(option) && statSync(option).isFile()) return option
  }
  return null
}

const files = new Set()          // repo-relative paths in nevermore
const usedExports = new Map()    // package name -> Map(subpath -> target)
const externals = new Map()      // package name -> Set(bare specifier root)
const ownerOf = (relative) => [...workspace].find(([, info]) => relative.startsWith(`${info.dir}/`))?.[0]
const noteExport = (name, subpath, target) => {
  if (!usedExports.has(name)) usedExports.set(name, new Map())
  usedExports.get(name).set(subpath, target)
}

function walk(relative, { isTest = false } = {}) {
  if (files.has(relative)) return
  files.add(relative)
  const absolute = path.join(source, relative)
  const text = readFileSync(absolute, 'utf8')
  const owner = ownerOf(relative)
  const pattern = /(?:import|export)\s+(?:type\s+)?(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g
  for (const match of text.matchAll(pattern)) {
    const specifier = match[1] ?? match[2]
    if (specifier.startsWith('node:')) continue
    if (specifier.startsWith('.')) {
      const target = fileFor(path.resolve(path.dirname(absolute), specifier))
      if (!target) throw new Error(`${relative}: cannot resolve ${specifier}`)
      walk(path.relative(source, target), { isTest })
      continue
    }
    const pkg = packageOf(specifier)
    if (!pkg) {
      // Test-only dependencies (vitest) belong to the test runner, not the package.
      if (isTest) continue
      const root = specifier.split('/').slice(0, specifier.startsWith('@') ? 2 : 1).join('/')
      if (!externals.has(owner)) externals.set(owner, new Set())
      externals.get(owner).add(root)
      continue
    }
    const info = workspace.get(pkg.name)
    let target = info.manifest.exports?.[pkg.subpath]
    if (target && typeof target === 'object') target = target.default ?? target.import
    if (typeof target !== 'string') throw new Error(`${relative}: ${specifier} is not an export of ${pkg.name}`)
    noteExport(pkg.name, pkg.subpath, target)
    if (owner && owner !== pkg.name) {
      if (!externals.has(owner)) externals.set(owner, new Set())
      externals.get(owner).add(pkg.name)
    }
    walk(path.join(info.dir, target), { isTest })
  }
}

for (const entry of config.entries) {
  const info = workspace.get(entry.package)
  if (!info) throw new Error(`${entry.package} is not a nevermore workspace package`)
  if (!entry.file.startsWith(`${info.dir}/`)) throw new Error(`${entry.file} is not inside ${entry.package}`)
  noteExport(entry.package, entry.export, `./${path.relative(info.dir, entry.file)}`)
  walk(entry.file)
  if (entry.tests) {
    for (const name of await readdir(path.join(source, entry.tests))) {
      if (name.endsWith('.test.ts')) walk(path.join(entry.tests, name), { isTest: true })
    }
  }
}

const outputs = new Map()
for (const relative of [...files].sort()) outputs.set(relative, readFileSync(path.join(source, relative)))
for (const [name, exportsMap] of usedExports) {
  const info = workspace.get(name)
  const dependencies = {}
  for (const dependency of [...(externals.get(name) ?? [])].sort()) {
    if (workspace.has(dependency)) { dependencies[dependency] = 'workspace:*'; continue }
    const declared = info.manifest.dependencies?.[dependency]
    if (!declared) throw new Error(`${name} imports ${dependency} but does not declare it`)
    const version = declared === 'catalog:' ? catalogVersion(dependency) : declared
    if (!version) throw new Error(`no catalog version for ${dependency}`)
    dependencies[dependency] = version
  }
  const manifest = {
    name,
    version: '0.0.0',
    private: true,
    description: `Vendored from ${config.repository}@${commit.slice(0, 8)} by scripts/vendor-nevermore.mjs. Do not edit.`,
    type: 'module',
    exports: Object.fromEntries([...exportsMap].sort(([a], [b]) => a.localeCompare(b))),
    ...(Object.keys(dependencies).length ? { dependencies } : {}),
  }
  outputs.set(`${info.dir}/package.json`, Buffer.from(JSON.stringify(manifest, null, 2) + '\n'))
}
const sha = buffer => createHash('sha256').update(buffer).digest('hex')
const provenance = {
  repository: config.repository,
  commit,
  entries: config.entries,
  files: Object.fromEntries([...files].sort().map(relative => [relative, sha(outputs.get(relative))])),
}
outputs.set('PROVENANCE.json', Buffer.from(JSON.stringify(provenance, null, 2) + '\n'))

if (check) {
  const stale = []
  for (const [relative, content] of outputs) {
    const current = await readFile(path.join(vendorRoot, relative)).catch(() => null)
    if (!current || !current.equals(content)) stale.push(relative)
  }
  if (stale.length) { console.error(`Out of date:\n  ${stale.slice(0, 20).join('\n  ')}`); process.exit(1) }
  console.log(`vendor/nevermore matches ${config.repository}@${commit.slice(0, 8)} (${files.size} files).`)
} else {
  await rm(vendorRoot, { recursive: true, force: true })
  for (const [relative, content] of outputs) {
    const target = path.join(vendorRoot, relative)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, content)
  }
  const lines = [...files].reduce((sum, relative) => sum + outputs.get(relative).toString('utf8').split('\n').length, 0)
  console.log(`Vendored ${files.size} files (${lines} lines) from ${config.repository}@${commit.slice(0, 8)}.`)
  for (const [name, exportsMap] of usedExports) console.log(`  ${name}: ${[...exportsMap.keys()].join(', ')}  deps: ${[...(externals.get(name) ?? [])].join(', ') || 'none'}`)
}
