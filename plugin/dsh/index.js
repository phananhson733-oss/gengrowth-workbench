// Server entry: wires the bundled content and the API-backed tools into Harness.
// Everything with behaviour worth testing lives in the sibling modules.
import { readFile } from 'node:fs/promises'
import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { createApiClient, ApiError } from './api-client.js'
import { candidatesFrom, loadManifest, readBody, summarize } from './catalog.js'
import { PROMPT_SECTION, promptText } from './prompt.js'
import { toolSpecs } from './tool-specs.js'

export const name = 'gengrowth-workbench'
export const inject = ['connection', 'tools', 'skills', 'systemPrompt']
export const Config = z.object({
  root: z.string().required().description('Directory for this workbench\'s own data, including api.json.'),
  skillPrefix: z.string().default('gg-').description('Prefix for bundled skill and prompt names. Empty keeps the source names, which other installed skills may shadow.'),
})

const PACKAGE_ROOT = new URL('../', import.meta.url)
const STATUS_PATH = '/api/gengrowth-workbench/status'

export async function apply(ctx, config) {
  const { version } = JSON.parse(await readFile(new URL('./package.json', PACKAGE_ROOT), 'utf8'))
  const manifest = await loadManifest(PACKAGE_ROOT)
  const prefix = config.skillPrefix
  const candidates = candidatesFrom(manifest, { packageRoot: PACKAGE_ROOT, prefix, provider: name })
  const api = createApiClient({ root: config.root })
  const describe = () => ({ plugin: name, version, ...summarize(manifest, prefix) })
  const specs = toolSpecs({ api, describe })

  ctx.skills.registerProvider(() => ({
    name,
    list: async () => candidates,
    get: async (selected) => {
      const candidate = candidates.find(entry => entry.name === selected.name)
      return candidate ? { ...candidate, content: await readBody(candidate) } : undefined
    },
  }))

  for (const spec of specs) {
    ctx.tools.register(defineTool({
      name: spec.name,
      description: spec.description,
      parameters: spec.parameters,
      // The payloads are defined by the API's own engine contracts, so the tool
      // layer passes them through instead of restating each shape here.
      output: { schema: { type: 'json' }, render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }] },
      timeoutMs: spec.timeoutMs,
      // Every tool here is a read: nothing on the user's machine or the audited site changes.
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

  ctx.systemPrompt.section({ name: PROMPT_SECTION, order: 116, text: promptText({ prefix }) })

  // Read by the workbench panel. Served on the Harness origin behind its own
  // access token, so the panel never sees the API token either.
  ctx.connection.fetch.register({
    path: STATUS_PATH,
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: async () => Response.json(
      { ...describe(), tools: specs.map(spec => ({ name: spec.name, title: spec.title })), api: await api.status() },
      { headers: { 'Cache-Control': 'no-store' } },
    ),
  })

  ctx.logger.info('%s %s: %d skills, %d prompts, %d tools registered', name, version,
    manifest.entries.filter(entry => entry.kind === 'skill').length,
    manifest.entries.filter(entry => entry.kind === 'prompt').length, specs.length)
}
