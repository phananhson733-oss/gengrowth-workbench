#!/usr/bin/env node
// Runs the plugins on the installed DSH Desktop's own Harness runtime, against a
// throwaway home. Nothing in the real DSH Desktop profile is read or changed,
// except for one generated file that is copied (see HOST_PATCH below).
//
// Why not plain `dsh web`: a workbench client needs Desktop's host plugins, and
// those need Desktop's patched Harness. Stock Harness fails its web boot with
// "waiting for service: desktopWorkbenches".
//
//   node scripts/dev-desktop.mjs [--port 3392] [--fresh] [--plugins plugin,plugin-pick]
//
// --plugins names the package directories to install, in order; the default is `plugin`.
//
// macOS only for now; the paths below are the macOS bundle layout.
import { execFileSync, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { copyFile, mkdir, readdir, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const option = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
const port = option('--port') ?? '3392'
const plugins = (option('--plugins') ?? 'plugin').split(',').map(name => name.trim()).filter(Boolean)

const app = process.env.DSH_DESKTOP_APP ?? '/Applications/DSH Desktop.app'
const resources = path.join(app, 'Contents/Resources')
const helper = path.join(app, 'Contents/Frameworks/DSH Desktop Helper.app/Contents/MacOS/DSH Desktop Helper')
const dshEntry = path.join(resources, 'app.asar/node_modules/@deepseek-ai/dsh/lib/bin.js')
const nodeEntry = path.join(resources, 'harness-node-entry.mjs')
const realHome = path.join(os.homedir(), 'Library/Application Support/dsh-desktop/harness')
// Desktop writes this on launch: the list of host plugins inside its bundle.
const HOST_PATCH = process.env.DSH_DESKTOP_HOST_PATCH ?? path.join(realHome, 'desktop-host-sources.patch.yml')
const devRoot = path.resolve(process.env.GG_DEV_HOME ?? path.join(os.homedir(), '.cache/gengrowth-workbench/desktop-home'))
const home = path.join(devRoot, 'harness')
const launchRoot = path.join(devRoot, 'launch-root')

function fail(message) { console.error(message); process.exit(1) }
if (process.platform !== 'darwin') fail('dev-desktop.mjs knows only the macOS layout of DSH Desktop.')
for (const required of [helper, nodeEntry, HOST_PATCH]) if (!existsSync(required)) fail(`Missing ${required}. Install DSH Desktop and launch it once.`)
if (devRoot === path.dirname(realHome) || devRoot.startsWith(path.dirname(realHome) + path.sep)) fail('GG_DEV_HOME points into the real DSH Desktop data directory.')
// Desktop installs a plugin from a staging directory that has no workspace file
// of its own. pnpm then climbs to the nearest pnpm-workspace.yaml and installs
// there instead, so a home inside any pnpm workspace corrupts that workspace.
for (let dir = devRoot; dir !== path.dirname(dir); dir = path.dirname(dir)) {
  if (existsSync(path.join(dir, 'pnpm-workspace.yaml'))) fail(`GG_DEV_HOME is inside the pnpm workspace at ${dir}; choose a directory outside it.`)
}

const runtime = (argv, options = {}) => [helper, ['--expose-internals', nodeEntry, dshEntry, ...argv], {
  cwd: launchRoot,
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', DSH_HOME: home },
  ...options,
}]

if (args.includes('--fresh')) await rm(devRoot, { recursive: true, force: true })
await mkdir(home, { recursive: true })
await mkdir(launchRoot, { recursive: true })
await copyFile(HOST_PATCH, path.join(home, 'desktop-host-sources.patch.yml'))

for (const plugin of plugins) {
  execFileSync(process.execPath, [path.join(repoRoot, 'scripts/pack-plugin.mjs'), plugin], { stdio: 'inherit' })
  const dist = path.join(repoRoot, plugin === 'plugin' ? '.dev/dist' : `.dev/dist-${plugin}`)
  const tarball = path.join(dist, (await readdir(dist)).find(name => name.endsWith('.tgz')))
  // Adding a tarball whose name and version are already installed is "already up to date"
  // to pnpm and leaves the old files in place, so a rebuilt package is removed first.
  const { name } = JSON.parse(await readFile(path.join(repoRoot, plugin, 'package.json'), 'utf8'))
  if (existsSync(path.join(home, 'profiles/web/node_modules', name))) {
    execFileSync(...runtime(['plugin', '--profile', 'web', 'remove', name], { stdio: 'inherit' }))
  }
  execFileSync(...runtime(['plugin', '--profile', 'web', 'add', tarball], { stdio: 'inherit' }))
}

console.log(`\nSandbox home: ${home}\nOpen the "dsh web:" URL printed below in a browser. Ctrl+C stops it.\n`)
const child = spawn(...runtime(['web', '--patch', path.join(home, 'desktop-host-sources.patch.yml'), '--no-open', '--host', '127.0.0.1', '--port', port], { stdio: 'inherit' }))
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
child.on('exit', code => process.exit(code ?? 0))
