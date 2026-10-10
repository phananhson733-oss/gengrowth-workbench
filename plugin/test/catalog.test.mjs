import assert from 'node:assert/strict'
import { test } from 'node:test'
import { candidatesFrom, loadManifest, readBody, SKILL_NAME, summarize } from '../dsh/catalog.js'

const packageRoot = new URL('../', import.meta.url)
const manifest = await loadManifest(packageRoot)

test('every manifest entry resolves to a file whose body loads without frontmatter', async () => {
  const candidates = candidatesFrom(manifest, { packageRoot, prefix: 'gg-', provider: 'p' })
  assert.equal(candidates.length, manifest.entries.length)
  for (const candidate of candidates) {
    const body = await readBody(candidate)
    assert.ok(body.length > 200, `${candidate.name} body is suspiciously short`)
    assert.ok(!body.startsWith('---'), `${candidate.name} body still carries frontmatter`)
  }
})

test('the prefix is applied to every name and keeps them valid and unique', () => {
  const candidates = candidatesFrom(manifest, { packageRoot, prefix: 'gg-', provider: 'p' })
  const names = candidates.map(candidate => candidate.name)
  assert.ok(names.every(name => name.startsWith('gg-') && SKILL_NAME.test(name)))
  assert.equal(new Set(names).size, names.length)
  assert.ok(names.includes('gg-seo-audit'))
})

test('an empty prefix keeps the source names', () => {
  const names = candidatesFrom(manifest, { packageRoot, prefix: '', provider: 'p' }).map(candidate => candidate.name)
  assert.ok(names.includes('seo-audit'))
})

test('a prefix that would produce an invalid skill name is rejected up front', () => {
  for (const prefix of ['GG-', 'gg', 'gg_', '-', 'g g-']) {
    assert.throws(() => candidatesFrom(manifest, { packageRoot, prefix, provider: 'p' }), /skillPrefix/, prefix)
  }
})

test('skills are offered to the model, prompt templates only to the user', () => {
  const candidates = candidatesFrom(manifest, { packageRoot, prefix: '', provider: 'p' })
  const kinds = new Map(manifest.entries.map(entry => [entry.name, entry.kind]))
  for (const candidate of candidates) {
    assert.equal(candidate.invocation.userInvocable, true)
    assert.equal(candidate.invocation.modelInvocable, kinds.get(candidate.name) === 'skill', candidate.name)
  }
})

test('duplicate names in a manifest fail instead of silently shadowing', () => {
  const doubled = { entries: [manifest.entries[0], manifest.entries[0]] }
  assert.throws(() => candidatesFrom(doubled, { packageRoot, prefix: '', provider: 'p' }), /duplicate skill name/)
})

test('the summary prefixes related-skill links the same way as names', () => {
  const summary = summarize(manifest, 'gg-')
  const names = new Set(summary.skills.map(skill => skill.name))
  const linked = summary.prompts.filter(prompt => prompt.relatedSkill)
  assert.ok(linked.length > 0)
  for (const prompt of linked) assert.ok(names.has(prompt.relatedSkill), `${prompt.name} links to missing ${prompt.relatedSkill}`)
})
