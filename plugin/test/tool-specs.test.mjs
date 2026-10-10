import assert from 'node:assert/strict'
import { test } from 'node:test'
import { promptText } from '../dsh/prompt.js'
import { toolSpecs } from '../dsh/tool-specs.js'

const describe = () => ({ plugin: 'gengrowth-workbench', version: '0.0.0', skills: [], prompts: [] })

test('tool names are unique, namespaced and described', () => {
  const specs = toolSpecs({ api: {}, describe })
  const names = specs.map(spec => spec.name)
  assert.equal(new Set(names).size, names.length)
  for (const spec of specs) {
    assert.match(spec.name, /^gengrowth_[a-z_]+$/)
    assert.ok(spec.description.length > 60, spec.name)
    assert.ok(Number.isFinite(spec.timeoutMs))
  }
})

test('the status tool merges the catalog with the API status', async () => {
  const [status] = toolSpecs({ api: { status: async () => ({ configured: false, reason: 'missing', reachable: false }) }, describe })
  assert.deepEqual(await status.execute({}), { ...describe(), api: { configured: false, reason: 'missing', reachable: false } })
})

test('the internal link audit posts only the url and unwraps the data envelope', async () => {
  const calls = []
  const api = { post: async (path, body, options) => { calls.push({ path, body, options }); return { data: { pages: 3 } } } }
  const audit = toolSpecs({ api, describe }).find(spec => spec.name === 'gengrowth_internal_link_audit')
  const signal = new AbortController().signal
  assert.deepEqual(await audit.execute({ url: 'https://example.com', extra: 'ignored' }, { signal }), { pages: 3 })
  assert.equal(calls[0].path, '/api/tools/internal-link-audit')
  assert.deepEqual(calls[0].body, { url: 'https://example.com' })
  assert.equal(calls[0].options.signal, signal)
})

test('the prompt section names the configured prefix and stays small', () => {
  const text = promptText({ prefix: 'gg-' })
  assert.ok(text.includes('gg-*'))
  assert.ok(text.length < 700, `prompt section is ${text.length} chars; it is paid on every turn`)
})
