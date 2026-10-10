import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { ApiError } from '../dsh/api-client.js'
import { GRADES, QUERY_PARAMETERS, RANKS, RS_SORTS, queryBody, toolSpecs } from '../dsh/tool-specs.js'

const captured = JSON.parse(await readFile(new URL('./fixtures/candidates.json', import.meta.url), 'utf8'))
function setup(query) {
  const recorded = []
  const calls = []
  const api = { query: async (body, options) => { calls.push({ body, options }); return query(body) }, status: async () => ({ configured: false, reason: 'missing', reachable: false }) }
  const specs = toolSpecs({ api, describe: () => ({ plugin: 'p', version: '0' }), onQuery: entry => recorded.push(entry) })
  return { recorded, calls, tool: name => specs.find(spec => spec.name === name) }
}

test('tool arguments become the Gateway query, leaving every unset filter to the server default', () => {
  assert.deepEqual(queryBody({ domain: 'candidates', scope: 'candidate_pool' }), { domain: 'candidates', scope: 'candidate_pool', period: { kind: 'latest', value: null }, offset: 0, limit: 10 })
  assert.deepEqual(
    queryBody({ domain: 'rankings', scope: 'full_catalog', rank: 'kd', period_kind: 'daily', period_value: '2026-10-08', limit: 20, offset: 40, grade: undefined, query: null, confirmed_eligible_only: false, tags: ['romance'] }),
    { domain: 'rankings', scope: 'full_catalog', rank: 'kd', confirmed_eligible_only: false, tags: ['romance'], period: { kind: 'daily', value: '2026-10-08' }, offset: 40, limit: 20 },
  )
  // Nothing outside the declared parameters reaches the Gateway: no pin, no budget, no write field.
  assert.deepEqual(Object.keys(queryBody({ domain: 'catalog', scope: 'full_catalog', budget_ms: 1, pin: {}, result_id: 'x', note: 'x' })).sort(), ['domain', 'limit', 'offset', 'period', 'scope'])
})

test('arguments that cannot be a query are refused before any request', async () => {
  const bad = [
    {}, { domain: 'candidates' }, { domain: 'candidates', scope: 'candidate_pool', limit: 21 }, { domain: 'candidates', scope: 'candidate_pool', limit: 0 },
    { domain: 'candidates', scope: 'candidate_pool', offset: -1 }, { domain: 'candidates', scope: 'candidate_pool', limit: 2.5 },
    { domain: 'rankings', scope: 'full_catalog', period_kind: 'daily' }, { domain: 'rankings', scope: 'full_catalog', period_kind: 'weekly', period_value: '10/08' },
    { domain: 'rankings', scope: 'full_catalog', period_value: '2026-10-08' }, { domain: 'posted', scope: 'full_catalog', published_from: 'yesterday' },
  ]
  for (const args of bad) assert.throws(() => queryBody(args), { code: 'invalid_arguments' }, JSON.stringify(args))
  const { tool, calls } = setup(async () => captured)
  await assert.rejects(tool('ggpick_query_data').execute({ domain: 'candidates' }), { code: 'invalid_arguments' })
  assert.equal(calls.length, 0)
})

test('the declared choices are the Gateway\'s own', () => {
  assert.equal(RANKS.length, 21)
  assert.deepEqual(GRADES, ['SSS', 'SS', 'S', 'A', 'B', 'C', 'D'])
  assert.equal(RS_SORTS.length, 11)
  assert.deepEqual(Object.entries(QUERY_PARAMETERS).filter(([, spec]) => spec.required).map(([key]) => key), ['domain', 'scope'])
  for (const [key, spec] of Object.entries(QUERY_PARAMETERS)) assert.ok(spec.type && spec.description, key)
})

test('a successful query returns the bounded answer and is remembered for the panel', async () => {
  // The Gateway echoes the request it resolved and pages by it.
  const { tool, recorded, calls } = setup(async body => ({ ...captured, request: { ...captured.request, ...body }, rows: captured.rows.slice(0, body.limit), next_offset: body.limit, truncated: true }))
  const controller = new AbortController()
  const result = await tool('ggpick_query_data').execute({ domain: 'candidates', scope: 'candidate_pool', limit: 5 }, { signal: controller.signal })
  assert.equal(result.status, 'ok')
  assert.equal(result.rows.length, 5)
  assert.equal(result.projection.next_offset, 5)
  assert.equal(calls[0].options.signal, controller.signal)
  assert.equal(calls[0].body.limit, 5)
  assert.deepEqual(recorded, [{ request: calls[0].body, result }])
})

test('an explained refusal is an answer; a broken connection or a denied token is an error', async () => {
  const refusal = new ApiError('invalid_query', '请使用榜单查询域指定期次和名次', 422, { explained: true })
  const rejecting = setup(async () => { throw refusal })
  const args = { domain: 'candidates', scope: 'candidate_pool', grade: 'S' }
  const result = await rejecting.tool('ggpick_query_data').execute(args)
  assert.deepEqual(result, { status: 'rejected', code: 'invalid_query', message: '请使用榜单查询域指定期次和名次', retryable: false })
  assert.equal(rejecting.recorded[0].rejection, result)

  for (const error of [
    new ApiError('forbidden', 'Pick API answered 403', 403),
    new ApiError('insufficient_scope', 'no', 403, { explained: true }),
    new ApiError('http_500', 'Pick API answered 500', 500, { retryable: true }),
    new ApiError('api_unreachable', 'Pick API could not be reached.', 0, { retryable: true }),
    new ApiError('api_not_configured', 'Pick API is not configured (missing).', 0),
  ]) {
    const failing = setup(async () => { throw error })
    await assert.rejects(failing.tool('ggpick_query_data').execute(args), caught => caught === error, error.code)
    assert.equal(failing.recorded.length, 0)
  }
  const odd = setup(async () => ({ detail: 'unexpected shape' }))
  await assert.rejects(odd.tool('ggpick_query_data').execute(args), { code: 'api_invalid_response' })
})

test('the panel\'s own queries are not remembered as the model\'s', async () => {
  const { tool, recorded } = setup(async () => captured)
  await tool('ggpick_query_data').execute({ domain: 'candidates', scope: 'candidate_pool' }, { record: false })
  assert.equal(recorded.length, 0)
})

test('the status tool reports the plugin and the connection', async () => {
  const { tool } = setup(async () => captured)
  assert.deepEqual(await tool('ggpick_workbench_status').execute({}), { plugin: 'p', version: '0', api: { configured: false, reason: 'missing', reachable: false } })
})
