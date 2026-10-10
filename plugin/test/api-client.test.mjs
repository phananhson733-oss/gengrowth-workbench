import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { ApiError, createApiClient, readApiConfig } from '../dsh/api-client.js'

async function rootWith(config) {
  const root = await mkdtemp(path.join(tmpdir(), 'gg-api-'))
  if (config !== undefined) await writeFile(path.join(root, 'api.json'), typeof config === 'string' ? config : JSON.stringify(config))
  return root
}
const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

test('a missing or unusable api.json reads as not configured, with the reason', async (t) => {
  const cases = [
    [undefined, 'missing'],
    ['{not json', 'invalid-json'],
    [{ baseUrl: 'nope', token: 't' }, 'invalid-base-url'],
    [{ baseUrl: 'http://example.com', token: 't' }, 'insecure-base-url'],
    [{ baseUrl: 'https://example.com', token: '  ' }, 'missing-token'],
  ]
  for (const [config, reason] of cases) {
    const root = await rootWith(config)
    t.after(() => rm(root, { recursive: true, force: true }))
    assert.deepEqual(await readApiConfig(root), { configured: false, reason })
  }
})

test('plain http is accepted only for loopback', async (t) => {
  for (const baseUrl of ['http://127.0.0.1:3210', 'http://localhost:3210/', 'https://api.example.com']) {
    const root = await rootWith({ baseUrl, token: 't' })
    t.after(() => rm(root, { recursive: true, force: true }))
    const config = await readApiConfig(root)
    assert.equal(config.configured, true, baseUrl)
    assert.ok(!config.baseUrl.endsWith('/'))
  }
})

test('requests carry the bearer token and the JSON body to the configured base', async (t) => {
  const root = await rootWith({ baseUrl: 'http://127.0.0.1:3210', token: 'secret-token' })
  t.after(() => rm(root, { recursive: true, force: true }))
  const calls = []
  const api = createApiClient({ root, fetchImpl: async (url, init) => { calls.push({ url, init }); return jsonResponse({ data: { ok: 1 } }) } })
  assert.deepEqual(await api.post('/api/tools/x', { url: 'https://a.test' }), { data: { ok: 1 } })
  assert.equal(calls[0].url, 'http://127.0.0.1:3210/api/tools/x')
  assert.equal(calls[0].init.headers.Authorization, 'Bearer secret-token')
  assert.equal(calls[0].init.body, '{"url":"https://a.test"}')
  assert.equal(calls[0].init.redirect, 'error')
})

test('an error answer surfaces the API error code and never the token', async (t) => {
  const root = await rootWith({ baseUrl: 'http://127.0.0.1:3210', token: 'secret-token' })
  t.after(() => rm(root, { recursive: true, force: true }))
  const api = createApiClient({ root, fetchImpl: async () => jsonResponse({ error: { code: 'robots_disallowed' } }, 422) })
  await assert.rejects(api.post('/api/tools/x', {}), (error) => {
    assert.ok(error instanceof ApiError)
    assert.equal(error.code, 'robots_disallowed')
    assert.equal(error.status, 422)
    assert.ok(!error.message.includes('secret-token'))
    return true
  })
})

test('a network failure becomes api_unreachable without leaking the cause', async (t) => {
  const root = await rootWith({ baseUrl: 'http://127.0.0.1:3210', token: 'secret-token' })
  t.after(() => rm(root, { recursive: true, force: true }))
  const api = createApiClient({ root, fetchImpl: async () => { throw new TypeError('fetch failed: secret-token') } })
  await assert.rejects(api.get('/api/health'), error => error.code === 'api_unreachable' && !error.message.includes('secret-token'))
})

test('calling without configuration fails before any request is made', async (t) => {
  const root = await rootWith(undefined)
  t.after(() => rm(root, { recursive: true, force: true }))
  let called = false
  const api = createApiClient({ root, fetchImpl: async () => { called = true; return jsonResponse({}) } })
  await assert.rejects(api.post('/api/tools/x', {}), error => error.code === 'api_not_configured')
  assert.equal(called, false)
})

test('status never throws: it reports unconfigured, unreachable and reachable', async (t) => {
  const none = await rootWith(undefined)
  const some = await rootWith({ baseUrl: 'http://127.0.0.1:3210', token: 't' })
  t.after(() => Promise.all([none, some].map(root => rm(root, { recursive: true, force: true }))))
  assert.deepEqual(await createApiClient({ root: none }).status(), { configured: false, reason: 'missing', reachable: false })
  const down = await createApiClient({ root: some, fetchImpl: async () => { throw new TypeError('down') } }).status()
  assert.deepEqual(down, { configured: true, baseUrl: 'http://127.0.0.1:3210', reachable: false, error: 'api_unreachable' })
  const up = await createApiClient({ root: some, fetchImpl: async () => jsonResponse({ service: 'gengrowth-workbench-api', version: '0.1.0', tools: ['internal-link-audit'] }) }).status()
  assert.equal(up.reachable, true)
  assert.equal(up.version, '0.1.0')
  assert.ok(!JSON.stringify(up).includes('"token"'))
})
