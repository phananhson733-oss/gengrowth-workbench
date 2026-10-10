// Server entry: wires the bundled skills, the read-only pick tools and the
// panel's routes into Harness. Everything with behaviour worth testing lives in
// the sibling modules.
import { readFile } from 'node:fs/promises'
import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { ApiError, createApiClient } from './api-client.js'
import { PROMPT_SECTION, promptText } from './prompt.js'
import { loadSkills, readBody } from './skills.js'
import { toolSpecs } from './tool-specs.js'

export const name = 'ggwork-pick-workbench'
export const inject = ['connection', 'tools', 'skills', 'systemPrompt']
export const Config = z.object({
  root: z.string().required().description('Directory for this workbench\'s own data, including api.json.'),
})

const PACKAGE_ROOT = new URL('../', import.meta.url)
export const ROUTES = {
  status: '/api/ggwork-pick-workbench/status',
  query: '/api/ggwork-pick-workbench/query',
  recent: '/api/ggwork-pick-workbench/recent',
}
const NO_STORE = { headers: { 'Cache-Control': 'no-store' } }

export async function apply(ctx, config) {
  const { version } = JSON.parse(await readFile(new URL('./package.json', PACKAGE_ROOT), 'utf8'))
  const skills = await loadSkills({ packageRoot: PACKAGE_ROOT, provider: name })
  const api = createApiClient({ root: config.root })
  const describe = () => ({ plugin: name, version, skills: skills.map(skill => ({ name: skill.name, description: skill.description })) })

  // The model's latest query, so the panel can show the table an answer was written from.
  // Process memory only: it holds catalogue rows, which have no business on disk here.
  let recent = null
  let seq = 0
  const remember = (entry) => { recent = { seq: ++seq, at: new Date().toISOString(), ...entry } }

  const specs = toolSpecs({ api, describe, onQuery: remember })
  const query = specs.find(spec => spec.name === 'ggpick_query_data')

  ctx.skills.registerProvider(() => ({
    name,
    list: async () => skills,
    get: async (selected) => {
      const skill = skills.find(entry => entry.name === selected.name)
      return skill ? { ...skill, content: await readBody(skill) } : undefined
    },
  }))

  for (const spec of specs) {
    ctx.tools.register(defineTool({
      name: spec.name,
      description: spec.description,
      parameters: spec.parameters,
      // The payload shape is owned by projection.js and the Gateway's contract,
      // so the tool layer passes it through instead of restating it here.
      output: { schema: { type: 'json' }, render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }] },
      timeoutMs: spec.timeoutMs,
      // Every tool here is a read: the token cannot write and the plugin offers no write call.
      isConcurrencySafe: () => true,
      presentCall: args => ({ card: 'generic', kind: 'execute', title: spec.title, rawInput: args }),
      async execute(args, exec) {
        try {
          return await spec.execute(args, { signal: exec?.signal })
        } catch (error) {
          const code = error instanceof ApiError ? error.code : 'unexpected'
          ctx.logger.info('%s: %s failed; code=%s', name, spec.name, code)
          throw error
        }
      },
    }))
  }

  ctx.systemPrompt.section({ name: PROMPT_SECTION, order: 117, text: promptText() })

  // The panel's routes are served on the Harness origin behind its own access
  // token, so the panel never holds the pick token.
  ctx.connection.fetch.register({
    path: ROUTES.status,
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: async () => Response.json(
      { ...describe(), tools: specs.map(spec => ({ name: spec.name, title: spec.title })), api: await api.status() },
      NO_STORE,
    ),
  })

  ctx.connection.fetch.register({
    path: ROUTES.recent,
    methods: ['GET'],
    requestBody: 'buffered',
    // `after` lets an open panel ask "anything newer than what I show?" without resending the table.
    fetch: async (request) => {
      const after = Number(new URL(request.url, 'http://harness.invalid').searchParams.get('after'))
      return Response.json({ seq, entry: recent && !(recent.seq <= after) ? recent : null }, NO_STORE)
    },
  })

  // The panel's own queries take the same path as the model's: the same argument
  // checks, the same read-only Gateway route and the same bounded answer.
  ctx.connection.fetch.register({
    path: ROUTES.query,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: async (request) => {
      let args
      try { args = await request.json() } catch { args = null }
      if (args === null || typeof args !== 'object' || Array.isArray(args)) {
        return Response.json({ status: 'error', code: 'invalid_arguments', message: 'The request body must be a JSON object.' }, { status: 400, ...NO_STORE })
      }
      try {
        return Response.json(await query.execute(args, { signal: request.signal, record: false }), NO_STORE)
      } catch (error) {
        const known = error instanceof ApiError
        if (!known) ctx.logger.info('%s: panel query failed; code=unexpected', name)
        return Response.json(
          { status: 'error', code: known ? error.code : 'unexpected', message: known ? error.message : 'The query failed inside the workbench plugin.' },
          { status: known && error.code === 'invalid_arguments' ? 400 : 502, ...NO_STORE },
        )
      }
    },
  })

  ctx.logger.info('%s %s: %d skills, %d tools registered', name, version, skills.length, specs.length)
}
