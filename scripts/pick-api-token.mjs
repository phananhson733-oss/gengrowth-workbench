#!/usr/bin/env node
// Connects the 选剧台 plugin in one DSH home to a ggwork-deerflow Gateway: signs
// in with your own account, creates one personal access token limited to the
// `pick:read` scope and writes it to that home's api.json.
//
// Run this yourself. The password is read from the terminal without echo (or
// from piped standard input) and is never taken from an argument, stored or
// printed; the token is written to the file and never printed.
//
//   node scripts/pick-api-token.mjs --dsh-home <DSH_HOME> [--base-url https://ggwork-deerflow.vercel.app] [--name dsh-pick-workbench]
import { chmod, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import readline from 'node:readline/promises'
import { Writable } from 'node:stream'

const args = process.argv.slice(2)
const option = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
const fail = (message) => { console.error(message); process.exit(1) }

const dshHome = option('--dsh-home')
const baseUrl = (option('--base-url') ?? 'https://ggwork-deerflow.vercel.app').replace(/\/+$/u, '')
const tokenName = option('--name') ?? 'dsh-pick-workbench'
if (!dshHome) fail('Pass --dsh-home <DSH_HOME>: the Harness home of the DSH Desktop that has the plugin installed.')
let origin
try { origin = new URL(baseUrl) } catch { fail(`--base-url is not a URL: ${baseUrl}`) }
const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)
// The password and the token both travel to this address.
if (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && loopback)) fail('--base-url must be https, or http on a loopback address.')

let piped
async function ask(question, { hidden = false } = {}) {
  if (!process.stdin.isTTY) {
    if (!piped) {
      let text = ''
      for await (const chunk of process.stdin) text += chunk
      piped = text.split(/\r?\n/u)
    }
    return piped.shift() ?? ''
  }
  const output = new Writable({ write(chunk, _encoding, done) { if (!output.silent) process.stdout.write(chunk); done() } })
  const prompt = readline.createInterface({ input: process.stdin, output, terminal: true })
  process.stdout.write(question)
  output.silent = hidden
  try { return await prompt.question('') } finally {
    prompt.close()
    if (hidden) process.stdout.write('\n')
  }
}

/** The name=value pairs of a response's Set-Cookie headers, for the one request that follows. */
const cookiesOf = response => new Map(response.headers.getSetCookie().map((line) => {
  const pair = line.split(';', 1)[0]
  const at = pair.indexOf('=')
  return [pair.slice(0, at).trim(), pair.slice(at + 1).trim()]
}))
/** What the Gateway said, without echoing anything this script sent. */
async function reasonOf(response) {
  const detail = await response.json().then(body => body?.detail, () => null)
  const said = typeof detail === 'string' ? detail : typeof detail?.message === 'string' ? detail.message : Array.isArray(detail) ? detail.map(item => item?.msg).filter(Boolean).join('; ') : ''
  return `HTTP ${response.status}${said ? `: ${said}` : ''}`
}

const email = (await ask('Email: ')).trim()
const password = await ask('Password: ', { hidden: true })
if (!email || !password) fail('An email and a password are needed.')

const request = (pathname, init) => fetch(`${baseUrl}${pathname}`, { redirect: 'error', signal: AbortSignal.timeout(30_000), ...init })
  .catch(() => fail(`Could not reach ${baseUrl}${pathname}.`))

const login = await request('/api/v1/auth/login/local', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
  body: new URLSearchParams({ username: email, password }),
})
if (!login.ok) fail(`Sign-in failed (${await reasonOf(login)}).`)
const cookies = cookiesOf(login)
const csrf = cookies.get('csrf_token')
if (!csrf) fail('Sign-in succeeded but the Gateway sent no CSRF cookie, so a token cannot be created from here.')

const created = await request('/api/v1/auth/pats', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join('; '),
    'X-CSRF-Token': csrf,
  },
  body: JSON.stringify({ name: tokenName, scopes: ['pick:read'] }),
})
if (!created.ok) {
  const reason = await reasonOf(created)
  const hint = /scope/iu.test(reason) ? '\nThis Gateway does not know the pick:read scope yet: it has to run a build that includes ggwork-deerflow PR #78.' : ''
  fail(`The token was not created (${reason}).${hint}`)
}
const body = await created.json()
if (typeof body?.token !== 'string' || !body.token) fail('The Gateway answered without a token.')
if (!Array.isArray(body.scopes) || body.scopes.length !== 1 || body.scopes[0] !== 'pick:read') fail('The Gateway created a token with other scopes than pick:read; it was not saved. Revoke it in the Gateway.')

const dataRoot = path.join(path.resolve(dshHome), 'ggwork-pick-workbench')
await mkdir(dataRoot, { recursive: true })
const target = path.join(dataRoot, 'api.json')
await writeFile(target, JSON.stringify({ baseUrl, token: body.token }, null, 2) + '\n', { mode: 0o600 })
await chmod(target, 0o600)
console.log(`Wrote ${target} for ${baseUrl} (token "${tokenName}", scope pick:read). Refresh the 选剧台 panel.`)
