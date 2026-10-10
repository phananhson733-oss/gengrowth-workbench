// Runs the real server entry against a stand-in context, then pushes every
// tool's real result through the Harness function that accepts or rejects it.
//
// 0.1.0 passed all other tests and still failed in a live session with
// `returned invalid output: value is not lossless JSON`: the status payload
// carried `undefined` properties. Harness snapshots a result as lossless JSON,
// checks it against the declared schema and renders it; the HTTP status route
// hid the defect because `Response.json` silently drops `undefined`.
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { renderSkillContent } from '@deepseek-ai/dsh-skill'
import { ToolRuntime } from '@deepseek-ai/dsh-tools'
import { apply, Config } from '../dsh/index.js'

async function activate({ apiJson } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'gg-entry-'))
  if (apiJson) {
    await mkdir(root, { recursive: true })
    await writeFile(join(root, 'api.json'), JSON.stringify(apiJson))
  }
  const registered = { tools: [], providers: [], sections: [], routes: [], logs: [] }
  const ctx = {
    tools: { register: tool => registered.tools.push(tool) },
    skills: { registerProvider: factory => registered.providers.push(factory()) },
    systemPrompt: { section: section => registered.sections.push(section) },
    connection: { fetch: { register: route => registered.routes.push(route) } },
    logger: { info: (...args) => registered.logs.push(args) },
  }
  await apply(ctx, Config({ root }))
  return { ...registered, tool: name => registered.tools.find(tool => tool.name === name), cleanup: () => rm(root, { recursive: true, force: true }) }
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
const TEST_API = { baseUrl: 'http://127.0.0.1:9', token: 't'.repeat(40) }

test('the entry registers the skills, tools, prompt section and status route', async () => {
  const entry = await activate()
  try {
    assert.deepEqual(entry.tools.map(tool => tool.name).sort(), ['gengrowth_internal_link_audit', 'gengrowth_workbench_status'])
    const listed = await entry.providers[0].list()
    assert.equal(listed.length, 24)
    assert.ok(listed.every(candidate => candidate.name.startsWith('gg-')))
    assert.equal(entry.sections.length, 1)
    assert.deepEqual(entry.routes.map(route => route.path), ['/api/gengrowth-workbench/status'])
  } finally { await entry.cleanup() }
})

test('Harness accepts the status result when the API is not configured', async () => {
  const entry = await activate()
  try {
    const tool = entry.tool('gengrowth_workbench_status')
    const result = accept(tool, {}, await tool.execute({}, {}))
    assert.equal(result.isError, false)
    assert.equal(result.value.skills.length, 8)
    assert.equal(result.value.prompts.length, 16)
    assert.deepEqual(result.value.api, { configured: false, reason: 'missing', reachable: false })
    assert.deepEqual(JSON.parse(result.content[0].text), result.value)
  } finally { await entry.cleanup() }
})

test('Harness accepts the status result when the API is down or answers sparsely', async () => {
  const entry = await activate({ apiJson: TEST_API })
  try {
    const tool = entry.tool('gengrowth_workbench_status')
    const down = await withFetch(async () => { throw new TypeError('fetch failed') }, async () => accept(tool, {}, await tool.execute({}, {})))
    assert.deepEqual(down.value.api, { configured: true, baseUrl: TEST_API.baseUrl, reachable: false, error: 'api_unreachable' })
    // A health body without the optional fields must not turn into `undefined` properties.
    const sparse = await withFetch(async () => new Response('{}', { status: 200 }), async () => accept(tool, {}, await tool.execute({}, {})))
    assert.deepEqual(sparse.value.api, { configured: true, baseUrl: TEST_API.baseUrl, reachable: true })
    assert.ok(!JSON.stringify(sparse.value).includes(TEST_API.token))
  } finally { await entry.cleanup() }
})

test('Harness accepts an audit result, and an empty API answer is an error rather than a result', async () => {
  const entry = await activate({ apiJson: TEST_API })
  try {
    const tool = entry.tool('gengrowth_internal_link_audit')
    const args = { url: 'https://acme.com' }
    const payload = { schema_version: 'internal_link_audit.v3', pages: [{ url: 'https://acme.com/', inlinks: 0 }], notes: null }
    const ok = await withFetch(async () => Response.json({ data: payload }), async () => accept(tool, args, await tool.execute(args, {})))
    assert.deepEqual(ok.value, payload)
    for (const body of ['', '{}', '{"data":null}']) {
      await withFetch(async () => new Response(body, { status: 200 }), () => assert.rejects(tool.execute(args, {}), { code: 'api_invalid_response' }, `body ${JSON.stringify(body)}`))
    }
    assert.ok(entry.logs.some(line => line.includes('api_invalid_response')))
  } finally { await entry.cleanup() }
})

test('a missing url is rejected before any request is made', async () => {
  const entry = await activate({ apiJson: TEST_API })
  try {
    let requests = 0
    await withFetch(async () => { requests++; return Response.json({ data: {} }) }, () => assert.rejects(entry.tool('gengrowth_internal_link_audit').execute({}, {})))
    assert.equal(requests, 0)
  } finally { await entry.cleanup() }
})

test('every skill loads into the shape Harness hands to the model', async () => {
  const entry = await activate()
  try {
    const provider = entry.providers[0]
    for (const candidate of await provider.list()) {
      const skill = await provider.get(candidate)
      for (const key of ['name', 'description', 'source', 'provider', 'content']) assert.equal(typeof skill[key], 'string', `${candidate.name}.${key}`)
      assert.equal(skill.name, candidate.name)
      // Harness's `skill` tool returns exactly these fields under a closed schema.
      assert.deepEqual(Object.keys(skill.resourceBase).sort(), ['kind', 'path'])
      assert.equal(skill.resourceBase.kind, 'directory')
      const loaded = { name: skill.name, provider: skill.provider, resourceBase: { ...skill.resourceBase }, content: skill.content }
      assert.deepEqual(JSON.parse(JSON.stringify(loaded)), loaded)
      assert.ok(renderSkillContent(skill).includes(skill.content.slice(0, 80)), `${candidate.name} body missing from the rendered skill`)
    }
    assert.equal(await provider.get({ name: 'gg-not-a-skill' }), undefined)
  } finally { await entry.cleanup() }
})
