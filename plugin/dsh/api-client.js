// Client for the GenGrowth workbench API, the service that runs the engines.
// The plugin never holds provider keys: it holds one bearer token for that API.
import { readFile } from 'node:fs/promises'
import path from 'node:path'

export const API_CONFIG_FILE = 'api.json'
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024

export class ApiError extends Error {
  constructor(code, message, status) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

/**
 * Reads `<root>/api.json`: `{ "baseUrl": "https://…", "token": "…" }`.
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

export function createApiClient({ root, fetchImpl = (...args) => globalThis.fetch(...args) }) {
  async function request(method, pathname, { body, signal, timeoutMs = 60_000 } = {}) {
    const config = await readApiConfig(root)
    if (!config.configured) throw new ApiError('api_not_configured', `GenGrowth API is not configured (${config.reason}).`, 0)
    const timeout = AbortSignal.timeout(timeoutMs)
    let response
    try {
      response = await fetchImpl(`${config.baseUrl}${pathname}`, {
        method,
        headers: {
          Authorization: `Bearer ${config.token}`,
          Accept: 'application/json',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
        redirect: 'error',
      })
    } catch (error) {
      if (signal?.aborted) throw error
      const code = error?.name === 'TimeoutError' ? 'api_timeout' : 'api_unreachable'
      // The cause can carry the request URL; the token is only in a header and never in the message.
      throw new ApiError(code, `GenGrowth API ${code === 'api_timeout' ? 'did not answer in time' : 'could not be reached'}.`, 0)
    }
    const text = await response.text()
    if (text.length > MAX_RESPONSE_BYTES) throw new ApiError('api_response_too_large', 'GenGrowth API returned an oversized response.', response.status)
    let payload
    try { payload = text ? JSON.parse(text) : null } catch { payload = null }
    if (!response.ok) {
      const code = typeof payload?.error?.code === 'string' ? payload.error.code : `http_${response.status}`
      throw new ApiError(code, `GenGrowth API answered ${response.status} (${code}).`, response.status)
    }
    return payload
  }
  return {
    get: (pathname, options) => request('GET', pathname, options),
    post: (pathname, body, options) => request('POST', pathname, { ...options, body }),
    /** Never throws: the status surfaces report the failure instead. */
    async status() {
      const config = await readApiConfig(root)
      if (!config.configured) return { configured: false, reason: config.reason, reachable: false }
      try {
        const health = await request('GET', '/api/health', { timeoutMs: 8_000 })
        // Only what the API actually reported: a tool returns this status, so it has to stay lossless JSON.
        const reported = {}
        for (const key of ['service', 'version', 'tools']) if (health?.[key] !== undefined) reported[key] = health[key]
        return { configured: true, baseUrl: config.baseUrl, reachable: true, ...reported }
      } catch (error) {
        return { configured: true, baseUrl: config.baseUrl, reachable: false, error: error instanceof ApiError ? error.code : 'unknown' }
      }
    },
  }
}
