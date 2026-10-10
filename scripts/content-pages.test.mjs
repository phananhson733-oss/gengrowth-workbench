import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MAX_SKILL_CHARS, promptFromPage, skillFromPage } from './content-pages.mjs'

const skillPage = (overrides = {}) => [
  '---', 'title: T', `status: ${overrides.status ?? 'published'}`, '---', '',
  '## What it does', 'prose', '',
  '## Skill file', '', '```markdown', '---', `name: ${overrides.name ?? 'seo-audit'}`, 'description: Audit a site.', '---', '',
  '## Steps', overrides.body ?? 'Do the audit.', '```', '',
  overrides.after ?? '## FAQ', 'tail',
].join('\n')

const promptPage = (overrides = {}) => [
  '---', 'title: Brief Prompt', 'description: Make a brief.', 'relatedSkill: content-brief', `status: ${overrides.status ?? 'published'}`, '---', '',
  '## Prompt', '', '```text', overrides.template ?? 'Query: {{primary_query}}\nReader: {{reader}}', '```', '',
  '## Variables', '', '### primary_query', 'Required. The query.', '', '### reader', 'Optional. The reader.', '',
  '## How to use', 'website prose that must not ship', '',
  '## FAQ', 'more website prose',
].join('\n')

test('a skill page yields the fenced SKILL.md verbatim, headings inside the fence included', () => {
  const skill = skillFromPage('seo-audit', skillPage())
  assert.equal(skill.kind, 'skill')
  assert.equal(skill.description, 'Audit a site.')
  assert.ok(skill.content.startsWith('---\nname: seo-audit\n'))
  assert.ok(skill.content.includes('## Steps\nDo the audit.'))
  assert.ok(!skill.content.includes('FAQ'))
})

test('unpublished pages are skipped', () => {
  assert.equal(skillFromPage('seo-audit', skillPage({ status: 'draft' })), null)
  assert.equal(promptFromPage('brief-prompt', promptPage({ status: 'draft' })), null)
})

test('a skill whose inner name differs from the page slug is rejected', () => {
  assert.throws(() => skillFromPage('seo-audit', skillPage({ name: 'other' })), /differs from the page slug/)
})

test('a skill body over the result limit is rejected rather than shipped truncated', () => {
  assert.throws(() => skillFromPage('seo-audit', skillPage({ body: 'x'.repeat(MAX_SKILL_CHARS) })), /exceeds/)
})

test('a prompt page becomes a template skill with its variables and without website prose', () => {
  const prompt = promptFromPage('brief-prompt', promptPage())
  assert.equal(prompt.kind, 'prompt')
  assert.deepEqual(prompt.variables, ['primary_query', 'reader'])
  assert.equal(prompt.relatedSkill, 'content-brief')
  assert.ok(prompt.content.startsWith('---\nname: brief-prompt\ndescription: Make a brief.\n---\n'))
  assert.ok(prompt.content.includes('### primary_query\nRequired. The query.'))
  assert.ok(prompt.content.includes('Query: {{primary_query}}'))
  assert.ok(!prompt.content.includes('website prose'))
})

test('a template variable with no definition fails the sync', () => {
  assert.throws(() => promptFromPage('brief-prompt', promptPage({ template: 'Use {{undefined_thing}}' })), /undefined variables: undefined_thing/)
})
