// Runs the real server entry against a stand-in context, then pushes every
// tool's real result through the Harness function that accepts or rejects it.
// A result with an `undefined` property passes every other test and still fails
// in a live session with `value is not lossless JSON`.
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { renderSkillContent } from '@deepseek-ai/dsh-skill'
import { ToolRuntime } from '@deepseek-ai/dsh-tools'
import { apply, Config, ROUTES } from '../dsh/index.js'

const captured = JSON.parse(await readFile(new URL('./fixtures/candidates.json', import.meta.url), 'utf8'))
const TEST_API = { baseUrl: 'http://127.0.0.1:9', token: `dfp_${'t'.repeat(40)}` }
const QUERY = { domain: 'candidates', scope: 'candidate_pool', limit: 3 }

async function activate({ apiJson } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'ggpick-entry-'))
  if (apiJson) await writeFile(join(root, 'api.json'), JSON.stringify(apiJson))
  const registered = { tools: [], providers: [], sections: [], routes: [], logs: [] }
  const ctx = {
    tools: { register: tool => registered.tools.push(tool) },
    skills: { registerProvider: factory => registered.providers.push(factory()) },
    systemPrompt: { section: section => registered.sections.push(section) },
    connection: { fetch: { register: route => registered.routes.push(route) } },
    logger: { info: (...args) => registered.logs.push(args) },
  }
  await apply(ctx, Config({ root }))
  return {
    ...registered,
    tool: name => registered.tools.find(tool => tool.name === name),
    route: path => registered.routes.find(route => route.path === path),
    cleanup: () => rm(root, { recursive: true, force: true }),
  }
}

/** The acceptance step of Harness's tool runtime, without the session machinery around it. */
function accept(tool, args, value) {
  const createSuccessResult = ToolRuntime.prototype.createSuccessResult
  assert.equal(typeof createSuccessResult, 'function', 'Harness moved its output acceptance; re-derive this check from the new tool runtime')
  const runtime = { concludingExecutions: new Set(), markCanonical: (_exec, result) => result, materializeFinalResult: result => result }
  return createSuccessResult.call(runtime, { name: tool.name, arguments: args }, tool, value)
}

const withFetch = async (impl, run) => {
  const original = globalThis.fetch
  globalThis.fetch = impl
  try { return await run() } finally { globalThis.fetch = original }
}
/** Answers like the Gateway: the sync status on GET, the query echoed and paged on POST. */
const gateway = ({ sync = { configured: false, current: { id: 'c1', published_at: '2026-10-09T08:05:00+00:00', rows: 24 }, runs: [], mirror: null }, seen = [] } = {}) => async (url, init) => {
  seen.push({ url: String(url), init })
  if (init.method === 'GET') return Response.json(sync)
  const body = JSON.parse(init.body)
  return Response.json({ ...captured, request: { ...captured.request, ...body }, rows: captured.rows.slice(0, body.limit) })
}
const rejecting = async () => Response.json({ detail: { code: 'invalid_query', message: '请使用榜单查询域指定期次和名次', retryable: false, current_version: null } }, { status: 422 })

test('the entry registers two read-only tools, two skills, one prompt section and the panel routes', async () => {
  const entry = await activate()
  try {
    assert.deepEqual(entry.tools.map(tool => tool.name).sort(), ['ggpick_query_data', 'ggpick_workbench_status'])
    assert.deepEqual((await entry.providers[0].list()).map(skill => skill.name), ['gg-pick-select', 'gg-pick-glossary'])
    assert.equal(entry.sections.length, 1)
    assert.match(entry.sections[0].text, /gg-pick-select/u)
    assert.deepEqual(entry.routes.map(route => `${route.methods.join(',')} ${route.path}`).sort(), [`GET ${ROUTES.recent}`, `GET ${ROUTES.status}`, `POST ${ROUTES.query}`])
    // Nothing here can write: the pick token cannot, and no tool or route offers to.
    const names = entry.tools.map(tool => `${tool.name} ${tool.description}`).join(' ')
    assert.ok(!/save|selection|schedule|publish\b/iu.test(entry.tools.map(tool => tool.name).join(' ')), names)
  } finally { await entry.cleanup() }
})

test('Harness accepts the status result whether the API is missing, down or up', async () => {
  const missing = await activate()
  try {
    const tool = missing.tool('ggpick_workbench_status')
    const result = accept(tool, {}, await tool.execute({}, {}))
    assert.equal(result.isError, false)
    assert.deepEqual(result.value.api, { configured: false, reason: 'missing', reachable: false })
    assert.deepEqual(result.value.skills.map(skill => skill.name), ['gg-pick-select', 'gg-pick-glossary'])
    assert.deepEqual(JSON.parse(result.content[0].text), result.value)
  } finally { await missing.cleanup() }

  const entry = await activate({ apiJson: TEST_API })
  try {
    const tool = entry.tool('ggpick_workbench_status')
    const down = await withFetch(async () => { throw new TypeError('fetch failed') }, async () => accept(tool, {}, await tool.execute({}, {})))
    assert.deepEqual(down.value.api, { configured: true, baseUrl: TEST_API.baseUrl, reachable: false, error: 'api_unreachable', message: 'Pick API could not be reached.' })
    const up = await withFetch(gateway(), async () => accept(tool, {}, await tool.execute({}, {})))
    assert.deepEqual(up.value.api.data, { sync_configured: false, catalog: { id: 'c1', published_at: '2026-10-09T08:05:00+00:00', rows: 24 }, mirror: null, last_sync_run: null })
    // A sparse or odd sync body must not turn into `undefined` properties.
    const sparse = await withFetch(async () => Response.json({}), async () => accept(tool, {}, await tool.execute({}, {})))
    assert.deepEqual(sparse.value.api.data, { sync_configured: false, catalog: null, mirror: null, last_sync_run: null })
    assert.ok(!JSON.stringify([down.value, up.value, sparse.value]).includes(TEST_API.token))
  } finally { await entry.cleanup() }
})

test('Harness accepts a real query answer and a refusal, and the token stays out of both', async () => {
  const entry = await activate({ apiJson: TEST_API })
  try {
    const tool = entry.tool('ggpick_query_data')
    const seen = []
    const ok = await withFetch(gateway({ seen }), async () => accept(tool, QUERY, await tool.execute(QUERY, {})))
    assert.equal(ok.isError, false)
    assert.equal(ok.value.status, 'ok')
    assert.deepEqual(ok.value.rows.map(row => row.title), captured.rows.slice(0, 3).map(row => row.drama.title))
    assert.deepEqual(JSON.parse(ok.content[0].text), ok.value)
    assert.equal(seen[0].url, `${TEST_API.baseUrl}/api/pick/query`)
    assert.equal(seen[0].init.method, 'POST')

    const args = { ...QUERY, grade: 'S' }
    const refused = await withFetch(rejecting, async () => accept(tool, args, await tool.execute(args, {})))
    assert.equal(refused.isError, false)
    assert.deepEqual(refused.value, { status: 'rejected', code: 'invalid_query', message: '请使用榜单查询域指定期次和名次', retryable: false })
    assert.ok(!JSON.stringify([ok.value, refused.value]).includes(TEST_API.token))
  } finally { await entry.cleanup() }
})

test('a denied token and a missing config are tool errors with a logged code, not empty results', async () => {
  const entry = await activate({ apiJson: TEST_API })
  try {
    const tool = entry.tool('ggpick_query_data')
    await withFetch(async () => Response.json({ detail: 'Personal access tokens cannot access this route' }, { status: 403 }), () => assert.rejects(tool.execute(QUERY, {}), { code: 'forbidden' }))
    assert.ok(entry.logs.some(line => line.includes('forbidden')))
    assert.ok(!JSON.stringify(entry.logs).includes(TEST_API.token))
  } finally { await entry.cleanup() }
  const missing = await activate()
  try {
    let requests = 0
    await withFetch(async () => { requests++; return Response.json({}) }, () => assert.rejects(missing.tool('ggpick_query_data').execute(QUERY, {}), { code: 'api_not_configured' }))
    // Harness checks the declared parameters itself, before the tool's own code runs.
    await withFetch(async () => { requests++; return Response.json({}) }, () => assert.rejects(missing.tool('ggpick_query_data').execute({}, {}), { code: 'INVALID_ARGS' }))
    await withFetch(async () => { requests++; return Response.json({}) }, () => assert.rejects(missing.tool('ggpick_query_data').execute({ ...QUERY, rank: 'not-a-board' }, {}), { code: 'INVALID_ARGS' }))
    assert.equal(requests, 0)
  } finally { await missing.cleanup() }
})

test('the panel sees the model\'s latest query, and its own queries do not replace it', async () => {
  const entry = await activate({ apiJson: TEST_API })
  try {
    const recent = async after => (await entry.route(ROUTES.recent).fetch(new Request(`http://harness.local${ROUTES.recent}${after === undefined ? '' : `?after=${after}`}`))).json()
    assert.deepEqual(await recent(), { seq: 0, entry: null })

    const tool = entry.tool('ggpick_query_data')
    const result = await withFetch(gateway(), () => tool.execute(QUERY, {}))
    const first = await recent(0)
    assert.equal(first.seq, 1)
    assert.deepEqual(first.entry.result, result)
    assert.equal(first.entry.request.limit, 3)
    assert.ok(!Number.isNaN(Date.parse(first.entry.at)))
    // An open panel that already shows it gets nothing to redraw.
    assert.deepEqual(await recent(1), { seq: 1, entry: null })

    const post = body => entry.route(ROUTES.query).fetch(new Request(`http://harness.local${ROUTES.query}`, { method: 'POST', body, headers: { 'Content-Type': 'application/json' } }))
    const panel = await withFetch(gateway(), () => post(JSON.stringify({ ...QUERY, limit: 2 })))
    assert.equal(panel.status, 200)
    assert.equal(panel.headers.get('Cache-Control'), 'no-store')
    const shown = await panel.json()
    assert.deepEqual([shown.status, shown.rows.length], ['ok', 2])
    assert.equal((await recent()).seq, 1)

    const refused = await withFetch(rejecting, () => post(JSON.stringify({ ...QUERY, grade: 'S' })))
    assert.deepEqual([refused.status, (await refused.json()).status], [200, 'rejected'])
    await withFetch(rejecting, () => tool.execute({ ...QUERY, grade: 'S' }, {}))
    assert.deepEqual((await recent(1)).entry.rejection, { status: 'rejected', code: 'invalid_query', message: '请使用榜单查询域指定期次和名次', retryable: false })
  } finally { await entry.cleanup() }
})

test('the panel routes answer every failure as JSON without the token', async () => {
  const entry = await activate({ apiJson: TEST_API })
  try {
    const post = body => entry.route(ROUTES.query).fetch(new Request(`http://harness.local${ROUTES.query}`, { method: 'POST', body }))
    for (const body of ['not json', '[]', '"text"', 'null']) {
      const response = await post(body)
      assert.deepEqual([response.status, (await response.json()).code], [400, 'invalid_arguments'], body)
    }
    const invalid = await post(JSON.stringify({ domain: 'candidates' }))
    assert.deepEqual([invalid.status, (await invalid.json()).code], [400, 'invalid_arguments'])
    const down = await withFetch(async () => { throw new TypeError('fetch failed') }, () => post(JSON.stringify(QUERY)))
    assert.deepEqual([down.status, await down.json()], [502, { status: 'error', code: 'api_unreachable', message: 'Pick API could not be reached.' }])
    const denied = await withFetch(async () => Response.json({ detail: 'Invalid token' }, { status: 401 }), () => post(JSON.stringify(QUERY)))
    assert.deepEqual([denied.status, (await denied.json()).code], [502, 'unauthorized'])

    const status = await withFetch(gateway(), async () => (await entry.route(ROUTES.status).fetch(new Request(`http://harness.local${ROUTES.status}`))).json())
    assert.equal(status.plugin, 'ggwork-pick-workbench')
    assert.deepEqual(status.tools.map(tool => tool.name), ['ggpick_workbench_status', 'ggpick_query_data'])
    assert.equal(status.api.reachable, true)
    assert.ok(!JSON.stringify(status).includes(TEST_API.token))
  } finally { await entry.cleanup() }
})

test('both skills load into the shape Harness hands to the model', async () => {
  const entry = await activate()
  try {
    const provider = entry.providers[0]
    for (const candidate of await provider.list()) {
      const skill = await provider.get(candidate)
      for (const key of ['name', 'description', 'source', 'provider', 'content']) assert.equal(typeof skill[key], 'string', `${candidate.name}.${key}`)
      assert.ok(skill.name.startsWith('gg-pick-'))
      assert.ok(!skill.content.startsWith('---'), 'the frontmatter is not part of the body')
      // Harness's `skill` tool returns exactly these fields under a closed schema.
      assert.deepEqual(Object.keys(skill.resourceBase).sort(), ['kind', 'path'])
      const loaded = { name: skill.name, provider: skill.provider, resourceBase: { ...skill.resourceBase }, content: skill.content }
      assert.deepEqual(JSON.parse(JSON.stringify(loaded)), loaded)
      assert.ok(renderSkillContent(skill).includes(skill.content.slice(0, 80)), `${candidate.name} body missing from the rendered skill`)
    }
    assert.equal(await provider.get({ name: 'gg-pick-not-a-skill' }), undefined)
    // The skill may only name tools and choices that exist.
    const select = (await provider.get({ name: 'gg-pick-select' })).content
    for (const tool of entry.tools) assert.ok(select.includes(tool.name), tool.name)
  } finally { await entry.cleanup() }
})
