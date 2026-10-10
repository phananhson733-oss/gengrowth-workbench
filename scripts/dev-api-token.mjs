#!/usr/bin/env node
// Local development only. Creates the API bearer token and, optionally, hands
// the same token to a DSH home so the plugin there can reach the local API.
// The token is written to files and never printed.
//
//   node scripts/dev-api-token.mjs [--dsh-home <DSH_HOME>] [--base-url http://127.0.0.1:3210] [--rotate]
import { randomBytes } from 'node:crypto'
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const option = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
const envFile = path.join(repoRoot, 'apps/api/.env.local')
const baseUrl = option('--base-url') ?? 'http://127.0.0.1:3210'
const dshHome = option('--dsh-home')

const current = await readFile(envFile, 'utf8').catch(() => '')
let token = /^GG_API_TOKEN=(\S+)$/m.exec(current)?.[1]
if (!token || args.includes('--rotate')) {
  token = randomBytes(32).toString('base64url')
  const rest = current.split('\n').filter(line => line && !line.startsWith('GG_API_TOKEN=')).join('\n')
  await writeFile(envFile, `${rest ? `${rest}\n` : ''}GG_API_TOKEN=${token}\n`, { mode: 0o600 })
  await chmod(envFile, 0o600)
  console.log(`Wrote a new token to ${path.relative(repoRoot, envFile)}.`)
} else {
  console.log(`Kept the token in ${path.relative(repoRoot, envFile)}.`)
}

if (dshHome) {
  const dataRoot = path.join(path.resolve(dshHome), 'gengrowth-workbench')
  await mkdir(dataRoot, { recursive: true })
  const target = path.join(dataRoot, 'api.json')
  await writeFile(target, JSON.stringify({ baseUrl, token }, null, 2) + '\n', { mode: 0o600 })
  await chmod(target, 0o600)
  console.log(`Wrote ${target} for ${baseUrl}.`)
}
