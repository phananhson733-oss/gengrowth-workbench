#!/usr/bin/env node
// Regenerates plugin/skills, plugin/prompts and plugin/content.manifest.json
// from a nevermore checkout. nevermore stays the source of truth for the
// wording; this repo only carries a generated copy.
//
//   NEVERMORE_DIR=<checkout> node scripts/sync-content.mjs [--locale en] [--check]
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promptFromPage, skillFromPage } from './content-pages.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const option = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
const source = option('--from') ?? process.env.NEVERMORE_DIR
const locale = option('--locale') ?? 'en'
const check = args.includes('--check')
if (!source) {
  console.error('Set NEVERMORE_DIR (or pass --from) to a nevermore checkout.')
  process.exit(2)
}

const contentRoot = path.join(source, 'apps/marketing/content')
const pluginRoot = path.join(repoRoot, 'plugin')
const kinds = [
  { kind: 'skill', from: `skills/${locale}`, to: 'skills', parse: skillFromPage },
  { kind: 'prompt', from: `prompts/${locale}`, to: 'prompts', parse: promptFromPage },
]

const commit = execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
const dirty = execFileSync('git', ['-C', source, 'status', '--porcelain', '--', 'apps/marketing/content'], { encoding: 'utf8' }).trim()
if (dirty) {
  console.error('The nevermore content directory has uncommitted changes; sync from a clean checkout so the recorded commit is true.')
  process.exit(1)
}

const entries = []
const files = new Map()
for (const { from, to, parse } of kinds) {
  const dir = path.join(contentRoot, from)
  for (const file of (await readdir(dir)).filter(name => name.endsWith('.md')).sort()) {
    const slug = path.basename(file, '.md')
    const entry = parse(slug, await readFile(path.join(dir, file), 'utf8'))
    if (!entry) continue
    const relative = `${to}/${slug}/SKILL.md`
    files.set(relative, entry.content)
    const { content, ...meta } = entry
    entries.push({
      ...meta,
      file: relative,
      chars: content.length,
      sha256: createHash('sha256').update(content).digest('hex'),
      sourcePath: `apps/marketing/content/${from}/${file}`,
    })
  }
}
const names = entries.map(entry => entry.name)
const duplicate = names.find((name, i) => names.indexOf(name) !== i)
if (duplicate) throw new Error(`"${duplicate}" is used by more than one page; skill names must be unique`)

const manifest = JSON.stringify({
  source: { repository: 'phananhson733-oss/nevermore', commit, locale },
  entries,
}, null, 2) + '\n'
files.set('content.manifest.json', manifest)

if (check) {
  const stale = []
  for (const [relative, content] of files) {
    const current = await readFile(path.join(pluginRoot, relative), 'utf8').catch(() => null)
    if (current !== content) stale.push(relative)
  }
  if (stale.length) { console.error(`Out of date:\n  ${stale.join('\n  ')}`); process.exit(1) }
  console.log(`In sync with nevermore@${commit.slice(0, 8)} (${entries.length} entries).`)
} else {
  // Generated directories are replaced whole so a page removed upstream does
  // not linger here as a skill nobody maintains.
  for (const { to } of kinds) await rm(path.join(pluginRoot, to), { recursive: true, force: true })
  for (const [relative, content] of files) {
    const target = path.join(pluginRoot, relative)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, content)
  }
  console.table(entries.map(({ kind, name, chars }) => ({ kind, name, chars })))
  console.log(`Wrote ${entries.length} entries from nevermore@${commit.slice(0, 8)}.`)
}
