// Tool definitions as plain data plus an `execute` that takes its dependencies.
// `index.js` turns each into a Harness tool; the tests call `execute` directly.

import { ApiError } from './api-client.js'

const INTERNAL_LINK_AUDIT_TIMEOUT_MS = 300_000

/** The API wraps every result in `{ data }`. A success without one is a broken answer, not an empty result. */
function dataOf(response) {
  const data = response?.data
  if (data === undefined || data === null) throw new ApiError('api_invalid_response', 'GenGrowth API answered without a result.', 200)
  return data
}

export function toolSpecs({ api, describe }) {
  return [
    {
      name: 'gengrowth_workbench_status',
      title: 'Check GenGrowth workbench',
      description: 'Report what the GenGrowth SEO/GEO workbench has loaded: bundled skills and prompt templates, and whether the GenGrowth API that runs the site tools is configured and reachable. Call it when a GenGrowth tool fails or the user asks what this workbench can do.',
      parameters: {},
      timeoutMs: 15_000,
      async execute() {
        return { ...describe(), api: await api.status() }
      },
    },
    {
      name: 'gengrowth_internal_link_audit',
      title: 'Audit internal links',
      description: 'Crawl one public website and report its internal linking: pages crawled, orphan and weakly linked pages, broken internal links, redirect hops and anchor text. Read-only and limited to pages the site allows crawlers to fetch. Takes up to a few minutes. Give the site URL the user named; do not guess one.',
      parameters: {
        url: { type: 'string', required: true, description: 'The website to audit, as a full URL such as https://example.com.' },
      },
      timeoutMs: INTERNAL_LINK_AUDIT_TIMEOUT_MS + 10_000,
      async execute(args, { signal } = {}) {
        const response = await api.post('/api/tools/internal-link-audit', { url: args.url }, { signal, timeoutMs: INTERNAL_LINK_AUDIT_TIMEOUT_MS })
        return dataOf(response)
      },
    },
  ]
}
