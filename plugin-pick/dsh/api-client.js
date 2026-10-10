// Client for the ggwork-deerflow Gateway's pick routes. The plugin holds one
// personal access token with the `pick:read` scope and nothing else: no
// password, no session cookie, no database or model credentials.
import { readFile } from 'node:fs/promises'
import path from 'node:path'

export const API_CONFIG_FILE = 'api.json'
export const QUERY_PATH = '/api/pick/query'
export const STATUS_PATH = '/api/pick/sync'
// The Gateway caps one query at 10 s and only lets a caller shorten it.
export const QUERY_BUDGET_MS = 10_000
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024
const MAX_MESSAGE_CHARS = 400

export class ApiError extends Error {
  /** @param options.explained - the Gateway itself said why, in words meant for the person asking */
  constructor(code, message, status, { retryable = false, explained = false } = {}) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.retryable = retryable
    this.explained = explained
  }
}

/**
 * Reads `<root>/api.json`: `{ "baseUrl": "https://…", "token": "dfp_…" }`.
 * It lives in the plugin's data directory rather than in a patch file because
 * patch layers are dumped by `--dump-config` and copied into diagnostics.
 */
export async function readApiConfig(root) {
  let raw
  try {
    raw = await readFile(path.join(root, API_CONFIG_FILE), 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') return { configured: false, reason: 'missing' }
    throw error
  }
  let parsed
  try { parsed = JSON.parse(raw) } catch { return { configured: false, reason: 'invalid-json' } }
  const baseUrl = typeof parsed?.baseUrl === 'string' ? parsed.baseUrl.trim().replace(/\/+$/u, '') : ''
  const token = typeof parsed?.token === 'string' ? parsed.token.trim() : ''
  let url
  try { url = new URL(baseUrl) } catch { return { configured: false, reason: 'invalid-base-url' } }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  // A bearer token over plain HTTP is readable by anything on the path.
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) return { configured: false, reason: 'insecure-base-url' }
  if (!token) return { configured: false, reason: 'missing-token' }
  return { configured: true, baseUrl, token }
}

/**
 * The Gateway answers business errors as `{ detail: { code, message, retryable } }`
 * with a message written for people, host errors as `{ detail: "…" }`, and
 * validation errors as `{ detail: [{ loc, msg }] }` without the rejected input.
 */
function failureOf(status, payload) {
  const detail = payload?.detail
  const clip = text => text.length > MAX_MESSAGE_CHARS ? `${text.slice(0, MAX_MESSAGE_CHARS)}…` : text
  if (detail && typeof detail === 'object' && !Array.isArray(detail) && typeof detail.code === 'string') {
    const message = typeof detail.message === 'string' && detail.message ? detail.message : `Pick API answered ${status}.`
    return new ApiError(detail.code, clip(message), status, { retryable: detail.retryable === true, explained: true })
  }
  if (Array.isArray(detail)) {
    const fields = detail.map(item => `${Array.isArray(item?.loc) ? item.loc.join('.') : '?'}: ${typeof item?.msg === 'string' ? item.msg : 'invalid'}`)
    return new ApiError('invalid_query', clip(`Pick API rejected the request: ${fields.join('; ')}`), status, { explained: true })
  }
  const code = status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : `http_${status}`
  const said = typeof detail === 'string' && detail ? `: ${detail}` : ''
  return new ApiError(code, clip(`Pick API answered ${status}${said}`), status, { retryable: status >= 500 })
}

export function createApiClient({ root, fetchImpl = (...args) => globalThis.fetch(...args) }) {
  async function request(method, pathname, { body, signal, timeoutMs = 15_000, headers = {} } = {}) {
    const config = await readApiConfig(root)
    if (!config.configured) throw new ApiError('api_not_configured', `Pick API is not configured (${config.reason}).`, 0)
    const timeout = AbortSignal.timeout(timeoutMs)
    let response
    try {
      response = await fetchImpl(`${config.baseUrl}${pathname}`, {
        method,
        headers: {
          Authorization: `Bearer ${config.token}`,
          Accept: 'application/json',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
        redirect: 'error',
      })
    } catch (error) {
      if (signal?.aborted) throw error
      const code = error?.name === 'TimeoutError' ? 'api_timeout' : 'api_unreachable'
      // The cause can carry the request URL; the token is only in a header and never in the message.
      throw new ApiError(code, `Pick API ${code === 'api_timeout' ? 'did not answer in time' : 'could not be reached'}.`, 0, { retryable: true })
    }
    const text = await response.text()
    if (text.length > MAX_RESPONSE_BYTES) throw new ApiError('api_response_too_large', 'Pick API returned an oversized response.', response.status)
    let payload
    try { payload = text ? JSON.parse(text) : null } catch { payload = null }
    if (!response.ok) throw failureOf(response.status, payload)
    if (payload === null || typeof payload !== 'object') throw new ApiError('api_invalid_response', 'Pick API answered without a JSON body.', response.status)
    return payload
  }

  return {
    /** One common query. The body is the Gateway's `CommonQuery`; the answer is its full `QueryResponse`. */
    query: (body, { signal } = {}) => request('POST', QUERY_PATH, {
      body: { ...body, budget_ms: QUERY_BUDGET_MS },
      signal,
      timeoutMs: QUERY_BUDGET_MS + 5_000,
      headers: { 'X-Pick-Query-Budget-Ms': String(QUERY_BUDGET_MS) },
    }),
    /** Never throws: the status surfaces report the failure instead. */
    async status() {
      const config = await readApiConfig(root)
      if (!config.configured) return { configured: false, reason: config.reason, reachable: false }
      try {
        const sync = await request('GET', STATUS_PATH, { timeoutMs: 8_000 })
        return { configured: true, baseUrl: config.baseUrl, reachable: true, data: dataStatus(sync) }
      } catch (error) {
        const known = error instanceof ApiError
        return { configured: true, baseUrl: config.baseUrl, reachable: false, error: known ? error.code : 'unknown', ...(known ? { message: error.message } : {}) }
      }
    },
  }
}

const scalar = value => value === null || ['string', 'number', 'boolean'].includes(typeof value)
/** The scalar fields of an object, so a status never carries a nested blob or an `undefined`. */
function scalars(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return Object.fromEntries(Object.entries(value).filter(([, item]) => scalar(item)))
}

/**
 * What the pick data currently is, reduced to what a person needs to judge
 * freshness: the catalog batch in use, the mirror's state and the last sync run.
 * A tool returns this, so it has to stay lossless JSON.
 */
export function dataStatus(sync) {
  const runs = Array.isArray(sync?.runs) ? sync.runs : []
  const mirror = scalars(sync?.mirror)
  // The mirror's failure text is free-form operator detail; when it last failed and how often is enough here.
  if (mirror) delete mirror.last_failure
  return {
    sync_configured: sync?.configured === true,
    catalog: scalars(sync?.current),
    // `current` is the mirror version rankings, posted records and rules are read from; null means there is none.
    mirror: mirror && { ...mirror, current: scalars(sync.mirror.current) },
    last_sync_run: scalars(runs[0]),
  }
}
