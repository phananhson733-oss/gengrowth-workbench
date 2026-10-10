// Reduces one Gateway `QueryResponse` to what a model can read in one turn.
//
// This is a bounded cut, not a port of the Gateway's own model projection
// (ggwork_pick/query_model_projection.py): that one also builds checker
// references and Decimal comparisons that exist only inside the Gateway. Here
// every value is copied as the Gateway sent it, and nothing is computed from it.
// No Harness imports: the unit tests call this module directly.

export const PROJECTION_VERSION = 'ggpick-model-v1'
export const MODEL_PAGE_LIMIT = 20
export const MODEL_BYTE_LIMIT = 48_000
export const MODEL_SIGNAL_LIMIT = 5
const FACET_LIMIT = 30
const PERIOD_OPTION_LIMIT = 14
const TITLE_LIMIT = 500
const ACCOUNT_LIMIT = 5

// The ReelShort observation columns a ranking is read by. Raw upstream values:
// `rr` and the `s*_rr` baselines are the platform's rolling 30-day metric in
// source units, `promoters_cnt` and `s*_p` are people.
const REELSHORT_FIELDS = [
  'locale', 'publish_at', 'metrics_valid', 'rr', 'promoters_cnt',
  's1_rr', 's7_rr', 's1_p', 's7_p', 'baseline1_at', 'baseline7_at',
  'clicks7', 'last_click_on', 'bill_orders', 'last_bill_on', 'bill_rank',
  'search_impressions', 'search_data_at', 'synced_at',
]
const BILL_FIELDS = ['bill_date', 'book_id', 'canonical_id', 'promotion_type', 'locale', 'order_cnt', 'source_rows', 'same_day_clicks']
const POSTED_FIELDS = ['sd', 'lang', 'platform', 'archived', 'post_count', 'sched_count', 'first_post_on', 'last_post_on']

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const clip = text => typeof text === 'string' && text.length > TITLE_LIMIT ? text.slice(0, TITLE_LIMIT) : text

/** The named fields that are present. An absent field stays absent: `undefined` is not lossless JSON. */
function pick(source, fields) {
  const out = {}
  for (const field of fields) if (source[field] !== undefined) out[field] = source[field]
  return out
}

/** The request as the Gateway resolved it, without the fields left at "no filter". */
function compactRequest(request) {
  const out = {}
  for (const [key, value] of Object.entries(request ?? {})) {
    if (key === 'budget_ms' || value === null || value === false || value === '') continue
    if (Array.isArray(value) && value.length === 0) continue
    out[key] = value
  }
  return out
}

/** The raw source key of a candidate row. RealShort identities carry it base64url-encoded. */
function sourceKey(row) {
  const key = row?.drama?.source_id
  if (row?.drama?.source !== 'realshort-pick' || typeof key !== 'string') return key
  if (!/^[A-Za-z0-9_-]*$/u.test(key)) return undefined
  try { return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from(key, 'base64url')) } catch { return undefined }
}

function dramaRow(row, selectedKind) {
  const drama = row.drama
  const signals = Array.isArray(drama.signals) ? [...drama.signals] : []
  // Stable: the signal the query was about comes first, the rest keep the source order.
  if (selectedKind) signals.sort((a, b) => Number(a?.kind !== selectedKind) - Number(b?.kind !== selectedKind))
  const shown = signals.slice(0, MODEL_SIGNAL_LIMIT).map(signal => pick(signal, ['kind', 'label', 'observed_at', 'value', 'rank', 'grade', 'note']))
  return {
    kind: 'drama',
    identity: row.identity,
    ...pick(drama, ['source', 'source_id', 'title', 'language', 'theater', 'tags', 'listed_at', 'availability', 'channel_rules', 'detail_url']),
    ...(isObject(drama.posted) ? { posted: pick(drama.posted, ['matched', 'post_count', 'sched_count', 'last_post_on']) } : {}),
    posted_status: row.posted_status,
    posted_scope_complete: row.posted_scope_complete,
    ...(Array.isArray(row.exclusion_reasons) && row.exclusion_reasons.length ? { exclusion_reasons: row.exclusion_reasons } : {}),
    signals: shown,
    signal_count: signals.length,
  }
}

/** A source record the Gateway could not give a candidate identity: readable, but nothing about it is confirmed. */
function catalogRecord(key, table, record) {
  return {
    kind: 'catalog_record',
    identity: null,
    row_key: key,
    source_table: table,
    title: clip(record.title),
    language: record.lang,
    theater: record.platform,
    listed_on: record.listed_on ?? null,
    availability: record.off_on ? 'delisted' : 'unknown',
    eligibility: 'unknown',
  }
}

/** @param positions - filled with each row's index in the Gateway's page when that differs from its index here */
function boardRows(response, positions) {
  const request = response.request ?? {}
  const board = isObject(response.board) ? response.board : {}
  const rows = Array.isArray(response.rows) ? response.rows : []
  const selectedKind = request.signal_kind || request.rank || null

  if (request.domain === 'rules') {
    const platformRules = isObject(board.rules?.platformRules) ? board.rules.platformRules : {}
    return Object.entries(platformRules).map(([platform, rule]) => ({
      kind: 'rule',
      platform,
      name: clip(typeof rule?.name === 'string' ? rule.name : ''),
      youtube_rule: ['ok', 'only', 'warn', 'no'].includes(rule?.yt) ? rule.yt : null,
    }))
  }
  if (request.domain === 'posted') {
    return (Array.isArray(board.posted) ? board.posted : []).map((record) => {
      const accounts = Array.isArray(record.accounts) ? record.accounts : []
      return { kind: 'posted', ...pick(record, POSTED_FIELDS), title: clip(record.title), accounts: accounts.slice(0, ACCOUNT_LIMIT), account_count: accounts.length }
    })
  }
  if (request.rank === 'rs_ledger') {
    return (Array.isArray(board.bill_rows) ? board.bill_rows : []).map(row => ({ kind: 'bill', ...pick(row, BILL_FIELDS), title: clip(row.title) }))
  }
  if (!Array.isArray(board.row_keys) || board.row_keys.length === 0) return rows.map(row => dramaRow(row, selectedKind))

  // `row_keys` is the ordered page. The other arrays decorate it and are not pages of their own.
  const facts = new Map(rows.map(row => [sourceKey(row), row]))
  const records = new Map()
  for (const table of ['catalog_rows', 'rs_rows']) {
    for (const record of Array.isArray(board[table]) ? board[table] : []) records.set(record.row_key, [table, record])
  }
  // A candidate row already carries its place on the board as a signal; a plain record has nowhere else to show it.
  const ranked = new Map((Array.isArray(board.rank_rows) ? board.rank_rows : []).map(entry => [entry.row_key, entry]))
  const out = []
  board.row_keys.forEach((key, position) => {
    const found = records.get(key)
    let projected
    // A record whose source language is blank stays a plain record even beside a candidate row.
    if (facts.has(key) && !(found && !found[1].lang)) projected = dramaRow(facts.get(key), selectedKind)
    else if (found) {
      projected = catalogRecord(key, found[0], found[1])
      const entry = ranked.get(key)
      if (isObject(entry?.signal)) {
        projected.ranking = {
          ...pick(entry.signal, ['kind', 'evidence_on', 'grade']),
          rank: entry.day_rank ?? entry.signal.rank ?? null,
          note: clip(entry.day_note || entry.signal.note || ''),
        }
      }
    } else return
    if (found?.[0] === 'rs_rows') projected.reelshort = pick(found[1], REELSHORT_FIELDS)
    // A key with nothing to show is skipped, so a row's place in the source page is kept beside it.
    positions.set(projected, position)
    out.push(projected)
  })
  return out
}

/** The largest entries of a count map, so one facet cannot crowd out the rows. */
function topCounts(counts) {
  if (!isObject(counts)) return {}
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, FACET_LIMIT))
}

function facetsOf(facets) {
  if (!isObject(facets)) return null
  const out = {}
  for (const key of ['platforms', 'languages', 'bases', 'posted', 'posted_states', 'ranks', 'grades']) {
    const counts = topCounts(facets[key])
    if (Object.keys(counts).length) out[key] = counts
  }
  return out
}

function periodOptionsOf(options) {
  if (!isObject(options)) return null
  const days = Array.isArray(options.days) ? options.days : []
  const weeks = Array.isArray(options.weeks) ? options.weeks : []
  return {
    resolution: options.resolution ?? null,
    days: days.slice(0, PERIOD_OPTION_LIMIT),
    day_count: days.length,
    weeks: weeks.slice(0, PERIOD_OPTION_LIMIT),
    week_count: weeks.length,
  }
}

/**
 * @param response - the Gateway's `QueryResponse`
 * @returns a JSON value of at most MODEL_BYTE_LIMIT bytes holding at most MODEL_PAGE_LIMIT rows
 */
export function projectForModel(response) {
  if (!isObject(response) || !isObject(response.request) || !isObject(response.counts) || !Array.isArray(response.rows)) {
    throw new TypeError('not a pick query response')
  }
  const request = response.request
  const board = isObject(response.board) ? response.board : {}
  const positions = new Map()
  const all = boardRows(response, positions)
  const offset = Number.isInteger(request.offset) ? request.offset : 0
  // Rules come whole from the Gateway, so their paging happens here.
  const paged = request.domain === 'rules'
  const available = paged ? all.slice(offset) : all
  const page = available.slice(0, Math.min(MODEL_PAGE_LIMIT, Number.isInteger(request.limit) ? request.limit : MODEL_PAGE_LIMIT))

  const base = {
    projection_version: PROJECTION_VERSION,
    request: compactRequest(request),
    pin: response.pin ?? null,
    actual_period: response.actual_period ?? null,
    period_options: periodOptionsOf(response.period_options),
    order_version: response.order_version ?? null,
    effective_sort: board.effective_sort ?? null,
    rank_limit: board.rank_limit ?? null,
    counts: response.counts,
    source_as_of: response.source_as_of ?? null,
    mirror_synced_at: response.mirror_synced_at ?? null,
    warnings: Array.isArray(response.warnings) ? response.warnings : [],
    facets: facetsOf(response.facets),
    ...(request.rank === 'rs_ledger' && isObject(board.bill_totals) ? { bill_totals: board.bill_totals } : {}),
  }
  for (;;) {
    const shown = page.length
    const omitted = available.length - shown
    // Where the next call continues: after the last row shown here, or where the Gateway said its own page ended.
    const after = shown ? (positions.get(page[shown - 1]) ?? shown - 1) + 1 : 0
    const more = omitted > 0 ? offset + after : paged ? null : response.next_offset ?? null
    const body = {
      ...base,
      rows: page,
      projection: {
        shown,
        omitted_rows: omitted,
        signals_omitted: page.reduce((sum, row) => sum + (row.kind === 'drama' ? row.signal_count - row.signals.length : 0), 0),
        next_offset: more,
        truncated: omitted > 0 || response.truncated === true,
        row_limit: MODEL_PAGE_LIMIT,
        byte_limit: MODEL_BYTE_LIMIT,
      },
    }
    if (Buffer.byteLength(JSON.stringify(body), 'utf8') <= MODEL_BYTE_LIMIT) return body
    if (shown === 0) throw new RangeError('the query answer does not fit the model projection even without rows')
    page.pop()
  }
}
