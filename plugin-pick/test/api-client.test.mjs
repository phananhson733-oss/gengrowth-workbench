import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { ApiError, createApiClient, dataStatus, readApiConfig } from '../dsh/api-client.js'

const TOKEN = `dfp_${'s'.repeat(40)}`
async function withRoot(apiJson, run) {
  const root = await mkdtemp(join(tmpdir(), 'ggpick-api-'))
  try {
    if (apiJson !== undefined) await writeFile(join(root, 'api.json'), typeof apiJson === 'string' ? apiJson : JSON.stringify(apiJson))
    return await run(root)
  } finally { await rm(root, { recursive: true, force: true }) }
}
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

test('the config is accepted only with a token and an https or loopback address', async () => {
  const reasonOf = apiJson => withRoot(apiJson, async root => (await readApiConfig(root)).reason)
  assert.equal(await reasonOf(undefined), 'missing')
  assert.equal(await reasonOf('{not json'), 'invalid-json')
  assert.equal(await reasonOf({ baseUrl: 'not a url', token: TOKEN }), 'invalid-base-url')
  assert.equal(await reasonOf({ baseUrl: 'http://ggwork-deerflow.vercel.app', token: TOKEN }), 'insecure-base-url')
  assert.equal(await reasonOf({ baseUrl: 'https://ggwork-deerflow.vercel.app', token: ' ' }), 'missing-token')
  await withRoot({ baseUrl: 'https://ggwork-deerflow.vercel.app/', token: ` ${TOKEN} ` }, async (root) => {
    assert.deepEqual(await readApiConfig(root), { configured: true, baseUrl: 'https://ggwork-deerflow.vercel.app', token: TOKEN })
  })
  await withRoot({ baseUrl: 'http://127.0.0.1:18431', token: TOKEN }, async root => assert.equal((await readApiConfig(root)).configured, true))
})

test('a query goes to the read-only route with the bearer token and the full budget', async () => {
  await withRoot({ baseUrl: 'http://127.0.0.1:9', token: TOKEN }, async (root) => {
    const calls = []
    const api = createApiClient({ root, fetchImpl: async (url, init) => { calls.push({ url, init }); return json(200, { rows: [] }) } })
    assert.deepEqual(await api.query({ domain: 'candidates', scope: 'candidate_pool' }), { rows: [] })
    const [{ url, init }] = calls
    assert.equal(url, 'http://127.0.0.1:9/api/pick/query')
    assert.equal(init.method, 'POST')
    assert.equal(init.headers.Authorization, `Bearer ${TOKEN}`)
    assert.equal(init.headers['X-Pick-Query-Budget-Ms'], '10000')
    // A redirect would carry the token to wherever it points.
    assert.equal(init.redirect, 'error')
    assert.deepEqual(JSON.parse(init.body), { domain: 'candidates', scope: 'candidate_pool', budget_ms: 10000 })
  })
})

test('each way the Gateway says no becomes one coded error, and none of them quotes the token', async () => {
  await withRoot({ baseUrl: 'http://127.0.0.1:9', token: TOKEN }, async (root) => {
    const failing = response => createApiClient({ root, fetchImpl: async () => response }).query({}).then(() => assert.fail('expected a rejection'), error => error)
    const business = await failing(json(422, { detail: { code: 'invalid_query', message: '请使用榜单查询域指定期次和名次', retryable: false, current_version: null } }))
    assert.deepEqual([business.code, business.message, business.status, business.retryable, business.explained], ['invalid_query', '请使用榜单查询域指定期次和名次', 422, false, true])
    const unavailable = await failing(json(503, { detail: { code: 'source_unavailable', message: '此版本没有完整镜像', retryable: true } }))
    assert.deepEqual([unavailable.code, unavailable.retryable, unavailable.explained], ['source_unavailable', true, true])
    const validation = await failing(json(422, { detail: [{ type: 'literal_error', loc: ['body', 'domain'], msg: 'Input should be one of…', input: 'secret-input' }] }))
    assert.deepEqual([validation.code, validation.explained], ['invalid_query', true])
    assert.match(validation.message, /body\.domain: Input should be/u)
    assert.ok(!validation.message.includes('secret-input'))
    const forbidden = await failing(json(403, { detail: 'Personal access tokens cannot access this route' }))
    assert.deepEqual([forbidden.code, forbidden.explained, forbidden.retryable], ['forbidden', false, false])
    assert.equal((await failing(json(401, { detail: 'Invalid token' }))).code, 'unauthorized')
    const crashed = await failing(new Response('<html>Bad gateway</html>', { status: 502 }))
    assert.deepEqual([crashed.code, crashed.explained, crashed.retryable], ['http_502', false, true])
    assert.equal((await failing(new Response('not json', { status: 200 }))).code, 'api_invalid_response')
    assert.equal((await failing(json(200, null))).code, 'api_invalid_response')
    const long = await failing(json(422, { detail: { code: 'invalid_query', message: '长'.repeat(2000) } }))
    assert.ok(long.message.length <= 401)
    for (const error of [business, unavailable, validation, forbidden, crashed, long]) {
      assert.ok(error instanceof ApiError)
      assert.ok(!`${error.message} ${error.stack}`.includes(TOKEN))
    }
  })
})

test('transport failures are coded and a missing config never reaches the network', async () => {
  await withRoot({ baseUrl: 'http://127.0.0.1:9', token: TOKEN }, async (root) => {
    const refusedBy = error => createApiClient({ root, fetchImpl: async () => { throw error } }).query({}).then(() => assert.fail('expected a rejection'), caught => caught)
    const down = await refusedBy(new TypeError(`fetch failed for Bearer ${TOKEN}`))
    assert.deepEqual([down.code, down.retryable], ['api_unreachable', true])
    assert.ok(!down.message.includes(TOKEN))
    assert.equal((await refusedBy(Object.assign(new Error('timed out'), { name: 'TimeoutError' }))).code, 'api_timeout')
    // The caller's own cancellation is passed on as it is.
    const controller = new AbortController()
    controller.abort()
    const aborted = new DOMException('aborted', 'AbortError')
    await assert.rejects(createApiClient({ root, fetchImpl: async () => { throw aborted } }).query({}, { signal: controller.signal }), error => error === aborted)
  })
  await withRoot(undefined, async (root) => {
    let requests = 0
    const api = createApiClient({ root, fetchImpl: async () => { requests++; return json(200, {}) } })
    await assert.rejects(api.query({}), { code: 'api_not_configured' })
    assert.deepEqual(await api.status(), { configured: false, reason: 'missing', reachable: false })
    assert.equal(requests, 0)
  })
})

test('the status reports the data in use without nested blobs, undefined values or failure text', async () => {
  const sync = {
    configured: true,
    current: { id: 'c1', status: 'published', shared: true, source_as_of: '2026-10-09 08:00', published_at: '2026-10-09T08:05:00+00:00', freshness: null, scope: undefined, rows: 5210 },
    runs: [{ id: 3, status: 'ok', finished_at: '2026-10-09T08:05:00+00:00', detail: { rows: 1 } }, { id: 2, status: 'failed' }],
    mirror: { enabled: true, current: { id: 7, as_of: '2026-10-09 08:00', latest_snapshot: '2026-10-09', published_at: '2026-10-09T08:05:00+00:00' }, behind: false, consecutive_failures: 1, last_failure_at: '2026-10-08T08:00:00+00:00', last_failure: 'connection to 10.0.0.5 refused', alert: false, warnings: ['w'], lock_stuck: null },
    obs: { channels: [{ channel: 'gsc' }] },
  }
  const data = dataStatus(sync)
  assert.deepEqual(data, {
    sync_configured: true,
    catalog: { id: 'c1', status: 'published', shared: true, source_as_of: '2026-10-09 08:00', published_at: '2026-10-09T08:05:00+00:00', freshness: null, rows: 5210 },
    mirror: { enabled: true, behind: false, consecutive_failures: 1, last_failure_at: '2026-10-08T08:00:00+00:00', alert: false, lock_stuck: null, current: { id: 7, as_of: '2026-10-09 08:00', latest_snapshot: '2026-10-09', published_at: '2026-10-09T08:05:00+00:00' } },
    last_sync_run: { id: 3, status: 'ok', finished_at: '2026-10-09T08:05:00+00:00' },
  })
  assert.deepEqual(JSON.parse(JSON.stringify(data)), data)
  // What a Gateway without a mirror answers: the local verification setup.
  assert.deepEqual(dataStatus({ configured: false, current: null, runs: [], mirror: null }), { sync_configured: false, catalog: null, mirror: null, last_sync_run: null })
  assert.deepEqual(dataStatus({ mirror: { error: 'OperationalError' } }).mirror, { error: 'OperationalError', current: null })

  await withRoot({ baseUrl: 'http://127.0.0.1:9', token: TOKEN }, async (root) => {
    const up = await createApiClient({ root, fetchImpl: async (url, init) => { assert.equal(`${init.method} ${url}`, 'GET http://127.0.0.1:9/api/pick/sync'); return json(200, sync) } }).status()
    assert.deepEqual(up, { configured: true, baseUrl: 'http://127.0.0.1:9', reachable: true, data })
    const denied = await createApiClient({ root, fetchImpl: async () => json(403, { detail: 'Personal access tokens cannot access this route' }) }).status()
    assert.deepEqual(denied, { configured: true, baseUrl: 'http://127.0.0.1:9', reachable: false, error: 'forbidden', message: 'Pick API answered 403: Personal access tokens cannot access this route' })
    assert.ok(!JSON.stringify([up, denied]).includes(TOKEN))
  })
})
