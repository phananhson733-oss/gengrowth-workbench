// `candidates.json` is a real answer of POST /api/pick/query, captured from a
// local Gateway holding a 24-row synthetic catalogue. That Gateway had no
// mirror, so the board-shaped answers below are built from the Gateway's
// contract (ggwork_pick/completion_contracts.py), not captured.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { MODEL_BYTE_LIMIT, MODEL_PAGE_LIMIT, MODEL_SIGNAL_LIMIT, projectForModel } from '../dsh/projection.js'

const captured = JSON.parse(await readFile(new URL('./fixtures/candidates.json', import.meta.url), 'utf8'))
const clone = value => JSON.parse(JSON.stringify(value))
const lossless = value => assert.deepEqual(JSON.parse(JSON.stringify(value)), value)

function drama(key, overrides = {}) {
  return {
    identity: JSON.stringify(['synthetic', key, 'en']),
    drama: { source: 'synthetic', source_id: key, language: 'en', title: `Drama ${key}`, theater: 'ShortMax', availability: 'active', signals: [], channel_rules: { youtube: 'allowed' }, posted: { matched: false, post_count: 0, sched_count: 0, last_post_on: null, records: [], accounts: [] }, ...overrides },
    posted_status: 'not_posted',
    posted_scope_complete: true,
    evidence_refs: [],
    exclusion_reasons: [],
  }
}
function answer(request, { rows = [], board = null, ...rest } = {}) {
  return {
    request: { domain: 'rankings', scope: 'full_catalog', offset: 0, limit: 20, ...request },
    pin: { catalog_batch_id: 'c1', mirror_version: 7, knowledge_batch_id: null, rule_version: 'r7' },
    actual_period: null, order_version: 'v1', counts: { total: rows.length, matched: rows.length, returned: rows.length, excluded: {} },
    truncated: false, next_offset: null, rows, board, facets: {}, period_options: null, source_as_of: '2026-10-09 08:00', mirror_synced_at: '2026-10-09T08:05:00+00:00', warnings: [],
    ...rest,
  }
}

test('a real candidates answer is cut to one page and says where the next one starts', () => {
  const out = projectForModel(captured)
  assert.equal(captured.rows.length, 22)
  assert.equal(out.rows.length, MODEL_PAGE_LIMIT)
  assert.deepEqual(out.counts, captured.counts)
  assert.deepEqual(out.pin, captured.pin)
  assert.deepEqual(out.projection, { shown: 20, omitted_rows: 2, signals_omitted: 0, next_offset: 20, truncated: true, row_limit: MODEL_PAGE_LIMIT, byte_limit: MODEL_BYTE_LIMIT })
  assert.deepEqual(out.rows.map(row => row.identity), captured.rows.slice(0, 20).map(row => row.identity))
  const first = out.rows[0]
  assert.equal(first.kind, 'drama')
  assert.equal(first.title, captured.rows[0].drama.title)
  assert.deepEqual(first.posted, { matched: false, post_count: 0, sched_count: 0, last_post_on: null })
  assert.equal(first.posted_status, captured.rows[0].posted_status)
  // Internal references and the per-post detail stay behind.
  const text = JSON.stringify(out)
  for (const dropped of ['source_ref', 'evidence_refs', '"records"', 'budget_ms']) assert.ok(!text.includes(dropped), dropped)
  assert.ok(Buffer.byteLength(text) <= MODEL_BYTE_LIMIT)
  lossless(out)
})

test('values are copied as sent: a missing field stays missing and an unknown stays unknown', () => {
  const response = clone(captured)
  delete response.rows[0].drama.detail_url
  response.rows[0].drama.channel_rules = {}
  const row = projectForModel(response).rows[0]
  assert.ok(!('detail_url' in row))
  assert.deepEqual(row.channel_rules, {})
  assert.equal(row.signals[0].grade, captured.rows[0].drama.signals[0].grade)
})

test('the page shrinks until it fits the byte limit and the next offset follows the rows actually shown', () => {
  const response = clone(captured)
  for (const row of response.rows) row.drama.signals = [{ kind: 'dbn', source_ref: 'x', note: '备'.repeat(1000), value: 'v'.repeat(4000) }]
  const out = projectForModel(response)
  assert.ok(out.rows.length > 0 && out.rows.length < MODEL_PAGE_LIMIT)
  assert.ok(Buffer.byteLength(JSON.stringify(out)) <= MODEL_BYTE_LIMIT)
  assert.equal(out.projection.shown, out.rows.length)
  assert.equal(out.projection.omitted_rows, response.rows.length - out.rows.length)
  assert.equal(out.projection.next_offset, out.rows.length)
  assert.equal(out.projection.truncated, true)
})

test('each row carries at most five signals, the one the query asked about first', () => {
  const kinds = ['kd', 'kw', 'qc', 'qr', 'smd', 'fh', 'sm']
  const response = answer({ domain: 'candidates', scope: 'candidate_pool', signal_kind: 'sm' }, {
    rows: [drama('a', { signals: kinds.map(kind => ({ kind, source_ref: `ref:${kind}`, grade: kind === 'sm' ? 'S' : '', label: kind })) })],
  })
  const row = projectForModel(response).rows[0]
  assert.equal(row.signals.length, MODEL_SIGNAL_LIMIT)
  assert.equal(row.signal_count, 7)
  assert.deepEqual(row.signals.map(signal => signal.kind), ['sm', 'kd', 'kw', 'qc', 'qr'])
  assert.equal(row.signals[0].grade, 'S')
  assert.equal(projectForModel(response).projection.signals_omitted, 2)
})

test('a board is read in row_keys order with the ReelShort observation beside each row', () => {
  const rs = (key, extra = {}) => ({ row_key: key, title: `RS ${key}`, lang: 'en', platform: 'ReelShort', off_on: null, locale: 'en', metrics_valid: true, rr: 120, promoters_cnt: 8, s1_rr: 100, s7_rr: 60, s1_p: 7, s7_p: 3, internal_blob: { a: 1 }, ...extra })
  const response = answer({ rank: 'rs_growth', rs_sort: 'd7' }, {
    // The Gateway's rows are not in board order and leave out what it could not identify.
    rows: [drama('k3'), drama('k1')],
    board: {
      row_keys: ['k1', 'k2', 'gone', 'k3', 'k4'],
      rs_rows: [rs('k1'), rs('k2', { metrics_valid: false, rr: null }), rs('k3'), rs('k4', { lang: '' })],
      effective_sort: 'growthD7', rank_limit: 500,
    },
    actual_period: { kind: 'latest', value: null },
    next_offset: 5,
  })
  const out = projectForModel(response)
  assert.deepEqual(out.rows.map(row => [row.kind, row.title]), [['drama', 'Drama k1'], ['catalog_record', 'RS k2'], ['drama', 'Drama k3'], ['catalog_record', 'RS k4']])
  assert.deepEqual(out.rows[0].reelshort, { locale: 'en', metrics_valid: true, rr: 120, promoters_cnt: 8, s1_rr: 100, s7_rr: 60, s1_p: 7, s7_p: 3 })
  // Not comparable is reported as sent, never as zero.
  assert.equal(out.rows[1].reelshort.metrics_valid, false)
  assert.equal(out.rows[1].reelshort.rr, null)
  assert.deepEqual([out.rows[1].identity, out.rows[1].eligibility], [null, 'unknown'])
  assert.equal(out.effective_sort, 'growthD7')
  assert.equal(out.rank_limit, 500)
  assert.equal(out.projection.next_offset, 5)
  lossless(out)
})

test('when a board page is cut short the next offset counts the keys that had nothing to show', () => {
  const keys = Array.from({ length: 30 }, (_, index) => `k${index}`)
  const response = answer({ rank: 'kd', limit: 30, offset: 40 }, {
    rows: keys.filter(key => key !== 'k3').map(key => drama(key)),
    board: { row_keys: keys, catalog_rows: [], rank_rows: [] },
  })
  const out = projectForModel(response)
  assert.equal(out.rows.length, MODEL_PAGE_LIMIT)
  // Twenty rows shown end at source position 20 (k3 was skipped), so the next call starts at 40 + 21.
  assert.equal(out.rows.at(-1).title, 'Drama k20')
  assert.equal(out.projection.next_offset, 61)
})

test('a ranked record without a candidate identity keeps its place on the board', () => {
  const response = answer({ rank: 'kd' }, {
    board: {
      row_keys: ['k1'],
      catalog_rows: [{ row_key: 'k1', title: 'Plain', lang: 'en', platform: 'KalosTV', off_on: '2026-10-01', listed_on: '2026-09-01' }],
      rank_rows: [{ row_key: 'k1', signal: { kind: 'kd', ord: 0, evidence_on: '2026-10-08', rank: 9, grade: '', note: '' }, day_rank: 3, day_note: 'up' }],
    },
  })
  assert.deepEqual(projectForModel(response).rows[0], {
    kind: 'catalog_record', identity: null, row_key: 'k1', source_table: 'catalog_rows', title: 'Plain', language: 'en', theater: 'KalosTV',
    listed_on: '2026-09-01', availability: 'delisted', eligibility: 'unknown', ranking: { kind: 'kd', evidence_on: '2026-10-08', grade: '', rank: 3, note: 'up' },
  })
})

test('posted records, ledger rows and rules each come out as their own kind of row', () => {
  const posted = projectForModel(answer({ domain: 'posted' }, {
    board: { row_keys: [], posted: [{ sd: 'D1', lang: 'en', platform: 'ShortMax', archived: false, post_count: 2, sched_count: 1, first_post_on: '2026-09-01', last_post_on: '2026-10-01', title: 'P', accounts: ['a', 'b', 'c', 'd', 'e', 'f'], posts: [{ acct: 'a', d: '2026-09-01' }], row_keys: ['k'], drama_ids: [] }] },
  }))
  assert.deepEqual(posted.rows, [{ kind: 'posted', sd: 'D1', lang: 'en', platform: 'ShortMax', archived: false, post_count: 2, sched_count: 1, first_post_on: '2026-09-01', last_post_on: '2026-10-01', title: 'P', accounts: ['a', 'b', 'c', 'd', 'e'], account_count: 6 }])

  const ledger = projectForModel(answer({ rank: 'rs_ledger' }, {
    board: { row_keys: [], bill_rows: [{ bill_date: '2026-10-08', book_id: 'b1', promotion_type: 'cps', canonical_id: null, title: 'L', locale: 'en', order_cnt: 4, source_rows: 2, same_day_clicks: 30 }], bill_totals: { orders: 4, days: 1 } },
  }))
  assert.deepEqual(ledger.rows, [{ kind: 'bill', bill_date: '2026-10-08', book_id: 'b1', canonical_id: null, promotion_type: 'cps', locale: 'en', order_cnt: 4, source_rows: 2, same_day_clicks: 30, title: 'L' }])
  assert.deepEqual(ledger.bill_totals, { orders: 4, days: 1 })

  const platformRules = Object.fromEntries(Array.from({ length: 5 }, (_, index) => [`T${index}`, { name: `Theater ${index}`, yt: ['ok', 'only', 'warn', 'no', 'odd'][index] }]))
  const rules = projectForModel(answer({ domain: 'rules', offset: 1, limit: 2 }, { board: { rules: { platformRules } } }))
  assert.deepEqual(rules.rows, [{ kind: 'rule', platform: 'T1', name: 'Theater 1', youtube_rule: 'only' }, { kind: 'rule', platform: 'T2', name: 'Theater 2', youtube_rule: 'warn' }])
  assert.deepEqual([rules.projection.omitted_rows, rules.projection.next_offset], [2, 3])
  const last = projectForModel(answer({ domain: 'rules', offset: 3, limit: 5 }, { board: { rules: { platformRules } } }))
  assert.deepEqual(last.rows.map(row => row.youtube_rule), ['no', null])
  assert.equal(last.projection.next_offset, null)
})

test('long option lists and facets are capped with their real sizes kept', () => {
  const days = Array.from({ length: 40 }, (_, index) => `2026-09-${String(index % 30 + 1).padStart(2, '0')}`)
  const platforms = Object.fromEntries(Array.from({ length: 50 }, (_, index) => [`P${index}`, index]))
  const out = projectForModel(answer({ rank: 'kd' }, { period_options: { resolution: 'latest', days, weeks: [] }, facets: { platforms, grades: {} } }))
  assert.equal(out.period_options.days.length, 14)
  assert.equal(out.period_options.day_count, 40)
  assert.equal(Object.keys(out.facets.platforms).length, 30)
  assert.equal(Object.keys(out.facets.platforms)[0], 'P49')
  assert.ok(!('grades' in out.facets))
})

test('anything that is not a query answer is refused instead of guessed at', () => {
  for (const bad of [null, [], {}, { request: {}, counts: {} }, { detail: 'Not Found' }]) assert.throws(() => projectForModel(bad), TypeError)
})

test('a ReelShort-only record is matched to its board key through its encoded source id', () => {
  const key = 'reelshort-剧 1'
  const row = drama('x', { source: 'realshort-pick', source_id: Buffer.from(key).toString('base64url'), title: 'Encoded' })
  const out = projectForModel(answer({ rank: 'rs_rr' }, { rows: [row], board: { row_keys: [key], rs_rows: [{ row_key: key, title: 'raw', lang: 'en', platform: 'ReelShort', off_on: null, rr: 5 }] } }))
  assert.deepEqual(out.rows.map(item => [item.kind, item.title, item.reelshort]), [['drama', 'Encoded', { rr: 5 }]])
})
