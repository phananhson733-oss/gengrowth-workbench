// The client entry is one script that DSH Desktop evaluates in its page. These
// tests evaluate the same file and render what it registers with real React,
// without a browser: the server renderer produces the markup.
//
// What needs a real page is recorded in docs/verification.md: the requests the
// panel makes once mounted, the stylesheet and the layout inside Desktop's frame.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { projectForModel } from '../dsh/projection.js'
import { queryBody, QUERY_PARAMETERS } from '../dsh/tool-specs.js'

const code = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
const captured = JSON.parse(await readFile(new URL('./fixtures/candidates.json', import.meta.url), 'utf8'))
const NS = 'ggwork-pick-workbench'

/** Evaluates the entry the way the page does and returns what its factory exports. */
function loadClient() {
  let registered
  const window = { __ModuleLoader__: { load: (module) => { registered = module } } }
  // Rendering on the server runs no effects, so neither the stylesheet nor a request may be reached.
  const fetch = () => { throw new Error('the panel must not fetch while rendering') }
  new Function('window', 'document', 'fetch', code)(window, undefined, fetch)
  const exports = registered.factory((name) => {
    assert.equal(name, 'react', 'the client may only require what the shared baseline provides')
    return React
  })
  return { id: registered.id, ...exports }
}

/** Same contract as Harness's locale service: methods read `this`, `{name}` placeholders. */
class FakeLocale {
  constructor(active = 'zh') {
    this.snapshot = { active, revision: 0 }
    this.dicts = new Map()
  }
  getSnapshot() { return this.snapshot }
  subscribe() { return () => {} }
  register(ns, dicts) { this.dicts.set(ns, dicts); return () => this.dicts.delete(ns) }
  bind(ns) {
    return (key, params) => {
      const template = this.dicts.get(ns)?.[this.snapshot.active]?.[key] ?? key
      return params ? template.replace(/\{(\w+)\}/g, (match, name) => name in params ? String(params[name]) : match) : template
    }
  }
}

function setup(active = 'zh') {
  const client = loadClient()
  const locale = new FakeLocale(active)
  const registered = []
  const disposers = []
  client.apply({
    locale,
    effect: (fn) => { disposers.push(fn()) },
    desktopWorkbenches: { register: (descriptor, Component) => { registered.push({ descriptor, Component }); return () => {} } },
  })
  const t = locale.bind(NS)
  const result = view => renderToStaticMarkup(React.createElement(client.Result, { t, view, busy: false, onPage: () => {} }))
  return { client, locale, registered, disposers, t, result }
}

test('the entry registers the workbench under the ggwork-deerflow identity in Desktop\'s default frame', () => {
  const { client, locale, registered, disposers } = setup()
  assert.equal(client.id, NS)
  assert.deepEqual(client.inject, ['desktopWorkbenches', 'locale'])
  assert.equal(registered.length, 1)
  assert.ok(disposers.every(dispose => typeof dispose === 'function'), 'every registration hands its disposer to ctx.effect')
  const { descriptor } = registered[0]
  assert.equal(descriptor.title, '选剧台')
  // Desktop derives the identity from this URL; an `id` of its own would be ignored or rejected.
  assert.equal(descriptor.repository, 'https://github.com/phananhson733-oss/ggwork-deerflow')
  assert.ok(!('id' in descriptor) && !('customFrame' in descriptor))
  assert.deepEqual(descriptor.layout, { businessSide: 'right', businessWidth: 0.5 })

  const { zh, en } = locale.dicts.get(NS)
  assert.deepEqual(Object.keys(zh).sort(), Object.keys(en).sort())
  for (const dict of [zh, en]) assert.ok(Object.values(dict).every(value => typeof value === 'string' && value.length > 0))
})

test('the panel renders with no session, no data and no request, and says it is read-only', () => {
  const { registered } = setup()
  const html = renderToStaticMarkup(React.createElement(registered[0].Component, { service: {}, entry: { id: 'phananhson733-oss/ggwork-deerflow', title: '选剧台' } }))
  for (const text of ['正在读取…', '选剧候选', '只看未发过', '查询', '还没有查询结果', '只读：这里不能保存、排期或发布。']) assert.ok(html.includes(text), text)
  assert.ok(!/保存到|加入清单|排期<\/button>|发布<\/button>/u.test(html))
  const english = setup('en')
  assert.ok(renderToStaticMarkup(React.createElement(english.registered[0].Component, { service: {}, entry: {} })).includes('Read-only'))
})

test('every form state becomes arguments the query tool declares and accepts', () => {
  const { client } = setup()
  const base = { view: 'candidates', theater: ' ShortMax ', language: 'en', query: '', basis: 'sm', onlyUnposted: true, onlyHot: false, rank: 'sm', grade: 'S', rsSort: 'bill', account: 'acct', postedState: 'pub' }
  const cases = {
    candidates: [base, { domain: 'candidates', scope: 'candidate_pool', theater: 'ShortMax', language: 'en', signal_kind: 'sm', exclude_posted: true, limit: 20, offset: 0 }],
    catalog: [{ ...base, view: 'catalog', basis: '', onlyUnposted: false, onlyHot: true, query: '爱' }, { domain: 'catalog', scope: 'full_catalog', theater: 'ShortMax', language: 'en', query: '爱', hot_only: true, limit: 20, offset: 0 }],
    // A board is its own theater: the theater, language and posted filters the Gateway would refuse are not sent.
    grade: [{ ...base, view: 'rankings' }, { domain: 'rankings', scope: 'full_catalog', rank: 'sm', grade: 'S', limit: 20, offset: 0 }],
    daily: [{ ...base, view: 'rankings', rank: 'kd' }, { domain: 'rankings', scope: 'full_catalog', rank: 'kd', limit: 20, offset: 0 }],
    growth: [{ ...base, view: 'rankings', rank: 'rs_growth', query: 'love' }, { domain: 'rankings', scope: 'full_catalog', rank: 'rs_growth', rs_sort: 'd1', rs_locale: 'en', query: 'love', limit: 20, offset: 0 }],
    bill: [{ ...base, view: 'rankings', rank: 'rs_rr' }, { domain: 'rankings', scope: 'full_catalog', rank: 'rs_rr', rs_sort: 'bill', rs_locale: 'en', limit: 20, offset: 0 }],
    ledger: [{ ...base, view: 'rankings', rank: 'rs_ledger', query: 'x' }, { domain: 'rankings', scope: 'full_catalog', rank: 'rs_ledger', limit: 20, offset: 0 }],
    posted: [{ ...base, view: 'posted' }, { domain: 'posted', scope: 'full_catalog', theater: 'ShortMax', language: 'en', account: 'acct', posted_state: 'pub', limit: 20, offset: 0 }],
  }
  for (const [name, [form, expected]] of Object.entries(cases)) {
    const args = client.argsOf(form, 0)
    assert.deepEqual(args, expected, name)
    for (const [key, value] of Object.entries(args)) {
      assert.ok(key in QUERY_PARAMETERS, `${name}: ${key} is not a tool parameter`)
      if (QUERY_PARAMETERS[key].enum) assert.ok(QUERY_PARAMETERS[key].enum.includes(value), `${name}: ${key}=${value}`)
    }
    assert.doesNotThrow(() => queryBody(args), name)
  }
  assert.equal(client.argsOf(base, 40).offset, 40)
})

test('times are shortened as sent, never shifted to another zone', () => {
  const { client } = setup()
  assert.equal(client.when('2026-10-09T08:05:00.123456+00:00'), '2026-10-09 08:05 UTC')
  assert.equal(client.when('2026-10-09T08:05:00Z'), '2026-10-09 08:05 UTC')
  assert.equal(client.when('2026-10-09T16:05:00+08:00'), '2026-10-09 16:05 +08:00')
  assert.equal(client.when('2026-10-09 08:00'), '2026-10-09 08:00')
  assert.equal(client.when('2026-10-09'), '2026-10-09')
  assert.equal(client.when('week 41'), 'week 41')
  assert.equal(client.when(null), '—')
})

test('a query answer is shown as the table the model read, with its counts and data times', () => {
  const { result } = setup()
  const data = { status: 'ok', ...projectForModel({ ...captured, request: { ...captured.request, limit: 5 }, rows: captured.rows.slice(0, 5), source_as_of: '2026-10-09 08:00', mirror_synced_at: '2026-10-09T08:05:00+00:00', warnings: ['榜期已过期'] }) }
  const html = result({ source: 'model', at: '2026-10-10T07:30:00.000Z', data })
  assert.ok(html.includes('对话里的查询 · 2026-10-10 07:30 UTC'))
  assert.ok(html.includes(`符合条件 ${captured.counts.matched} 条，本页 5 条`))
  assert.ok(html.includes('来源数据 2026-10-09 08:00') && html.includes('同步 2026-10-09 08:05 UTC'))
  assert.ok(html.includes('榜期已过期'))
  assert.equal((html.match(/<tr>/gu) || []).length, 6)
  for (const row of captured.rows.slice(0, 5)) assert.ok(html.includes(row.drama.title))
  assert.ok(html.includes('ShortMax weekly · SS · 第 1 名 · 2026-10-06'))
  assert.ok(html.includes('href="https://example.invalid/drama/1"') && html.includes('rel="noreferrer noopener"'))
  // The model's table cannot be paged from the panel: paging would run the panel's form instead.
  assert.ok(!html.includes('下一页'))
  const own = result({ source: 'panel', at: '2026-10-10T07:30:00.000Z', data: { ...data, projection: { ...data.projection, next_offset: 5 } } })
  assert.ok(own.includes('面板查询') && own.includes('下一页') && own.includes('上一页'))
})

test('source text is never markup and only an https address becomes a link', () => {
  const { result } = setup()
  const row = { kind: 'drama', identity: 'i', title: '<img src=x onerror=alert(1)>', theater: 'T', language: 'en', detail_url: 'javascript:alert(1)', signals: [], signal_count: 0, posted_status: 'not_posted' }
  const html = result({ source: 'panel', at: '2026-10-10T07:30:00Z', data: { status: 'ok', request: {}, counts: { matched: 1 }, rows: [row], warnings: [], projection: { next_offset: null } } })
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'))
  assert.ok(!html.includes('<img') && !html.includes('href='))
  assert.ok(html.includes('记录里未发'))
})

test('board rows show what cannot be compared or verified instead of a number', () => {
  const { result } = setup()
  const rows = [
    { kind: 'drama', identity: 'a', title: 'A', theater: 'ReelShort', language: 'en', signals: [], signal_count: 0, posted_status: 'posted', posted: { post_count: 3 }, reelshort: { metrics_valid: true, rr: 120, promoters_cnt: 8 } },
    { kind: 'drama', identity: 'b', title: 'B', theater: 'ReelShort', language: 'en', signals: [], signal_count: 0, posted_status: 'unknown', reelshort: { metrics_valid: false, rr: null } },
    { kind: 'catalog_record', identity: null, row_key: 'c', title: 'C', theater: 'ReelShort', language: 'en', ranking: { kind: 'kd', rank: 3, grade: '', evidence_on: '2026-10-08' } },
  ]
  const html = result({ source: 'panel', at: '2026-10-10T07:30:00Z', data: { status: 'ok', request: { rank: 'rs_growth' }, actual_period: { kind: 'latest', value: null }, counts: { matched: 3 }, rows, warnings: [], projection: { next_offset: null } } })
  assert.ok(html.includes('ReelShort 涨幅榜') && html.includes('期次 latest'))
  assert.ok(html.includes('指标 120 · 推广 8') && html.includes('指标不可比'))
  assert.ok(html.includes('发过 (3)') && html.includes('未知'))
  assert.ok(html.includes('未核对的来源记录') && html.includes('KalosTV 日榜 · 第 3 名 · 2026-10-08'))
})

test('posted records, ledger rows and rules each get their own columns', () => {
  const { result } = setup()
  const view = rows => result({ source: 'panel', at: '2026-10-10T07:30:00Z', data: { status: 'ok', request: {}, counts: { matched: rows.length }, rows, warnings: [], projection: { next_offset: null } } })
  const posted = view([{ kind: 'posted', title: 'P', platform: 'ShortMax', lang: 'en', post_count: 2, sched_count: 1, last_post_on: '2026-10-01' }])
  assert.ok(posted.includes('最近发布') && posted.includes('2026-10-01'))
  const ledger = view([{ kind: 'bill', bill_date: '2026-10-08', title: 'L', locale: 'en', order_cnt: 4, same_day_clicks: 30 }])
  assert.ok(ledger.includes('订单数') && ledger.includes('>4<') && ledger.includes('>30<'))
  const rules = view([{ kind: 'rule', platform: 'DramaBox', name: 'DramaBox', youtube_rule: 'no' }, { kind: 'rule', platform: 'X', name: 'X', youtube_rule: null }])
  assert.ok(rules.includes('禁发') && rules.includes('YouTube 规则'))
})

test('a refusal, a failure and an empty answer are three different things on screen', () => {
  const { result } = setup()
  const refused = result({ source: 'model', at: '2026-10-10T07:30:00Z', data: { status: 'rejected', code: 'invalid_query', message: '请使用榜单查询域指定期次和名次', retryable: false } })
  assert.ok(refused.includes('这次查询没有执行：请使用榜单查询域指定期次和名次') && refused.includes('role="status"'))
  const failed = result({ source: 'panel', at: '2026-10-10T07:30:00Z', data: { status: 'error', code: 'api_unreachable', message: 'Pick API could not be reached.' } })
  assert.ok(failed.includes('查询失败（api_unreachable）') && failed.includes('role="alert"'))
  const empty = result({ source: 'panel', at: '2026-10-10T07:30:00Z', data: { status: 'ok', request: {}, counts: { matched: 0 }, rows: [], warnings: [], projection: { next_offset: null } } })
  assert.ok(empty.includes('没有符合条件的记录。') && !empty.includes('<table'))
  assert.ok(result(null).includes('还没有查询结果'))
})
