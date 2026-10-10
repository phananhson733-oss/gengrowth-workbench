// Client entry for DSH Desktop. One file, no build step: it only uses what the
// shared module baseline provides (React), the host locale service and the
// workbench host service.
//
// The panel sits in Desktop's default workbench frame, so the conversation, the
// start actions and the layout around it stay Desktop's own. It shows the table
// the model's latest query returned and offers the same read-only query as a
// small form, which also works before any session exists.
window.__ModuleLoader__.load({
  id: 'ggwork-pick-workbench',
  factory: (require) => {
    const React = require('react')
    const h = React.createElement
    const NS = 'ggwork-pick-workbench'
    const ROUTES = {
      status: '/api/ggwork-pick-workbench/status',
      query: '/api/ggwork-pick-workbench/query',
      recent: '/api/ggwork-pick-workbench/recent',
    }
    const STYLE_ID = 'gg-pick-styles'
    const PAGE_SIZE = 20
    const POLL_MS = 4000

    // Board codes as the Gateway defines them; the labels are the boards' own names.
    const RANKS = [
      ['sm', 'ShortMax 评级'], ['mg', 'MoboReels 评级'], ['kd', 'KalosTV 日榜'], ['kw', 'KalosTV 周热门'],
      ['qc', '鹊娱 7 日转化率 Top25'], ['qr', '鹊娱 7 日总收入 Top25'], ['smd', 'ShortMax 每日推荐'],
      ['fh', 'FlickReels 爆款剧单'], ['sh', 'StarShort 高充值剧单'], ['gh', 'GoodShort 爆款推荐'],
      ['gn', 'GoodShort 重点推荐'], ['ghh', 'GoodShort 历史高充值'], ['dbn', 'DramaBox 运营备注'],
      ['rs_growth', 'ReelShort 涨幅榜'], ['rs_rr', 'ReelShort 30 天指标'], ['rs_cand', 'ReelShort 候选清单'],
      ['rs_pc', 'ReelShort 推广人数'], ['rs_clk', 'ReelShort 7 天出站'], ['rs_gsc', 'ReelShort 搜索需求'],
      ['rs_bill', 'ReelShort 预估分成'], ['rs_ledger', 'ReelShort 订单对账'],
    ]
    const RANK_LABEL = Object.fromEntries(RANKS)
    const GRADES = ['SSS', 'SS', 'S', 'A', 'B', 'C', 'D']
    const GROWTH_SORTS = ['d1', 'd7', 'dp1', 'dp7']
    const RS_SORTS = ['rr', 'd1', 'd7', 'dp1', 'dp7', 'promoters', 'publish', 'bill', 'eff', 'gsc', 'clicks']
    const SORTABLE = { rs_growth: GROWTH_SORTS, rs_rr: RS_SORTS, rs_cand: RS_SORTS }
    const VIEWS = ['candidates', 'catalog', 'rankings', 'posted']

    const zh = {
      loading: '正在读取…',
      retry: '重试',
      refresh: '刷新',
      panelFailed: '这个面板暂时无法显示，会话不受影响。',
      statusFailed: '无法读取选剧台状态：{error}',
      apiNotConfigured: '选剧数据接口还没有配置（{reason}）。在本机运行 scripts/pick-api-token.mjs 写入 api.json 后刷新。',
      apiUnreachable: '已配置 {baseUrl}，但连不上（{error}）。',
      apiConnected: '已连接 {baseUrl}',
      catalogAt: '剧库更新于 {at}',
      mirrorAt: '镜像同步于 {at}',
      noMirror: '没有镜像：榜单、发布记录和规则查不了',
      readOnly: '只读：这里不能保存、排期或发布。',
      filters: '筛选',
      view: '查看',
      'view.candidates': '选剧候选',
      'view.catalog': '全部剧库',
      'view.rankings': '榜单',
      'view.posted': '发布记录',
      theater: '剧场',
      theaterHint: '如 ShortMax',
      language: '语种',
      languageHint: '如 en',
      search: '搜索',
      searchHint: '剧名',
      basis: '依据',
      any: '不限',
      onlyUnposted: '只看未发过',
      onlyHot: '只看有热门依据',
      rank: '榜单',
      grade: '评级',
      sort: '排序',
      'sort.rr': '30 天销售指标', 'sort.d1': '较昨日变化', 'sort.d7': '较 7 天前变化', 'sort.dp1': '推广人数较昨日', 'sort.dp7': '推广人数 7 天变化',
      'sort.promoters': '推广人数', 'sort.publish': '上线日期', 'sort.bill': '预估分成', 'sort.eff': '指标/推广人数', 'sort.gsc': '搜索需求', 'sort.clicks': '7 天出站',
      account: '账号',
      postedState: '状态',
      'state.pub': '已发', 'state.sched': '已排期未发', 'state.none': '未排期', 'state.nomatch': '剧库未对上',
      run: '查询',
      running: '查询中…',
      empty: '还没有查询结果。在对话里让模型选剧，或用上面的筛选查一次。',
      fromModel: '对话里的查询 · {at}',
      fromPanel: '面板查询 · {at}',
      summary: '符合条件 {matched} 条，本页 {shown} 条',
      period: '期次 {period}',
      sourceAt: '来源数据 {at}',
      syncedAt: '同步 {at}',
      rejected: '这次查询没有执行：{message}',
      queryFailed: '查询失败（{code}）：{message}',
      noRows: '没有符合条件的记录。',
      prev: '上一页',
      next: '下一页',
      'col.title': '剧名', 'col.theater': '剧场', 'col.language': '语种', 'col.basis': '依据', 'col.posted': '发布', 'col.metrics': 'ReelShort 观测',
      'col.posts': '已发', 'col.scheduled': '已排期', 'col.lastPost': '最近发布', 'col.date': '日期', 'col.orders': '订单数', 'col.clicks': '当日点击', 'col.rule': 'YouTube 规则', 'col.name': '名称',
      'posted.posted': '发过', 'posted.not_posted': '记录里未发', 'posted.unknown': '未知',
      'rule.ok': '可发', 'rule.only': '仅清单内', 'rule.warn': '需留意', 'rule.no': '禁发',
      unverified: '未核对的来源记录',
      notComparable: '指标不可比',
      rankNo: '第 {rank} 名',
      metricLine: '指标 {rr} · 推广 {promoters}',
    }
    const en = {
      loading: 'Loading…',
      retry: 'Retry',
      refresh: 'Refresh',
      panelFailed: 'This panel could not be shown. The conversation is not affected.',
      statusFailed: 'Could not read the workbench status: {error}',
      apiNotConfigured: 'The pick data API is not configured ({reason}). Run scripts/pick-api-token.mjs on this machine to write api.json, then refresh.',
      apiUnreachable: 'Configured for {baseUrl} but not reachable ({error}).',
      apiConnected: 'Connected to {baseUrl}',
      catalogAt: 'catalog updated {at}',
      mirrorAt: 'mirror synced {at}',
      noMirror: 'no mirror: rankings, posted records and rules cannot be queried',
      readOnly: 'Read-only: nothing here saves, schedules or publishes.',
      filters: 'Filters',
      view: 'View',
      'view.candidates': 'Candidates',
      'view.catalog': 'Full catalog',
      'view.rankings': 'Rankings',
      'view.posted': 'Posted records',
      theater: 'Theater',
      theaterHint: 'e.g. ShortMax',
      language: 'Language',
      languageHint: 'e.g. en',
      search: 'Search',
      searchHint: 'title',
      basis: 'Evidence',
      any: 'Any',
      onlyUnposted: 'Not posted yet',
      onlyHot: 'Has hot evidence',
      rank: 'Board',
      grade: 'Grade',
      sort: 'Sort',
      'sort.rr': '30-day metric', 'sort.d1': 'vs yesterday', 'sort.d7': 'vs 7 days ago', 'sort.dp1': 'promoters vs yesterday', 'sort.dp7': 'promoters over 7 days',
      'sort.promoters': 'promoters', 'sort.publish': 'publish date', 'sort.bill': 'estimated share', 'sort.eff': 'metric per promoter', 'sort.gsc': 'search demand', 'sort.clicks': '7-day outbound',
      account: 'Account',
      postedState: 'State',
      'state.pub': 'Published', 'state.sched': 'Scheduled', 'state.none': 'Not scheduled', 'state.nomatch': 'Not matched',
      run: 'Query',
      running: 'Querying…',
      empty: 'No result yet. Ask the model to pick dramas in the conversation, or run a query with the filters above.',
      fromModel: 'Query from the conversation · {at}',
      fromPanel: 'Panel query · {at}',
      summary: '{matched} match, {shown} on this page',
      period: 'period {period}',
      sourceAt: 'source data {at}',
      syncedAt: 'synced {at}',
      rejected: 'The query was not run: {message}',
      queryFailed: 'Query failed ({code}): {message}',
      noRows: 'No matching records.',
      prev: 'Previous',
      next: 'Next',
      'col.title': 'Title', 'col.theater': 'Theater', 'col.language': 'Lang', 'col.basis': 'Evidence', 'col.posted': 'Posted', 'col.metrics': 'ReelShort observation',
      'col.posts': 'Posts', 'col.scheduled': 'Scheduled', 'col.lastPost': 'Last post', 'col.date': 'Date', 'col.orders': 'Orders', 'col.clicks': 'Same-day clicks', 'col.rule': 'YouTube rule', 'col.name': 'Name',
      'posted.posted': 'posted', 'posted.not_posted': 'no post on record', 'posted.unknown': 'unknown',
      'rule.ok': 'allowed', 'rule.only': 'listed only', 'rule.warn': 'caution', 'rule.no': 'denied',
      unverified: 'unverified source record',
      notComparable: 'metric not comparable',
      rankNo: 'No. {rank}',
      metricLine: 'metric {rr} · promoters {promoters}',
    }

    // Colours come from Desktop's --dsw-alias-* tokens so both themes follow the host.
    const css = `
      .ggPick{display:flex;flex-direction:column;gap:12px;box-sizing:border-box;height:100%;min-height:0;padding:12px 16px 16px;overflow:auto;font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary)}
      .ggPick p{margin:0}
      .ggPick>*{flex:none}
      .ggPickMuted{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
      .ggPickNotice{padding:8px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-layer-1)}
      .ggPickForm{display:grid;grid-template-columns:repeat(auto-fill,minmax(128px,1fr));align-items:end;gap:8px 10px}
      .ggPickField{display:flex;flex-direction:column;gap:2px;min-width:0;font-size:12px;color:var(--dsw-alias-label-secondary)}
      .ggPickField input,.ggPickField select{font:inherit;font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary);box-sizing:border-box;width:100%;min-width:0;padding:4px 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-layer-1)}
      .ggPickCheck{display:flex;align-items:center;gap:6px;min-height:30px;font-size:13px;color:var(--dsw-alias-label-primary)}
      .ggPickForm .ggPickBtn{justify-self:start}
      .ggPickBtn{font:inherit;font-size:13px;line-height:20px;color:inherit;padding:4px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-layer-1);white-space:nowrap;cursor:pointer}
      .ggPickBtn:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2)}
      .ggPickBtn:disabled{cursor:default;color:var(--dsw-alias-label-secondary)}
      .ggPickBtnPrimary:not(:disabled){background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground);border-color:transparent}
      .ggPickBtnPrimary:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover,var(--dsw-alias-button-primary-fill))}
      .ggPickBtn:focus-visible,.ggPickField input:focus-visible,.ggPickField select:focus-visible,.ggPick a:focus-visible{outline:2px solid var(--dsw-alias-label-primary);outline-offset:2px}
      .ggPickTableWrap{min-width:0;overflow-x:auto;border:1px solid var(--dsw-alias-border-l2);border-radius:6px}
      .ggPickTable{width:100%;border-collapse:collapse;font-size:13px;line-height:19px}
      .ggPickTable th,.ggPickTable td{padding:6px 10px;text-align:left;vertical-align:top;white-space:nowrap;border-bottom:1px solid var(--dsw-alias-border-l2)}
      .ggPickTable th{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary);white-space:nowrap;background:var(--dsw-alias-bg-layer-1)}
      .ggPickTable tr:last-child td{border-bottom:0}
      .ggPickTable td.ggPickNum{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
      .ggPickTable td.ggPickTitle{min-width:150px;max-width:260px;white-space:normal;overflow-wrap:anywhere}
      .ggPick a{color:inherit;text-decoration:underline;text-underline-offset:2px}
      .ggPickRow{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
      .ggPickSpacer{flex:1}
    `
    // Desktop can replace the document head during a live client rebuild, so the
    // panel restores the sheet whenever it renders instead of installing it once.
    function ensureStyles() {
      if (document.getElementById(STYLE_ID)) return
      const style = document.createElement('style')
      style.id = STYLE_ID
      style.textContent = css
      document.head.appendChild(style)
    }

    // Desktop already isolates a failed panel from the conversation; this keeps
    // the notice in the panel's own words and language.
    class Boundary extends React.Component {
      state = { failed: false }
      static getDerivedStateFromError() { return { failed: true } }
      render() { return this.state.failed ? h('p', { role: 'alert', className: 'ggPick' }, this.props.message) : this.props.children }
    }

    /** A timestamp or date as the Gateway sent it, shortened for a table. Never reinterpreted across time zones. */
    function when(value) {
      if (typeof value !== 'string' || !value) return '—'
      const match = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}))?/u.exec(value)
      if (!match) return value
      if (!match[2]) return match[1]
      const zone = /(Z|[+-]\d{2}:?\d{2})$/u.exec(value)?.[1]
      return `${match[1]} ${match[2]}${!zone ? '' : /^(Z|[+-]00:?00)$/u.test(zone) ? ' UTC' : ` ${zone}`}`
    }
    const shown = value => value === null || value === undefined || value === '' ? '—' : String(value)

    /** The panel form as the arguments of `ggpick_query_data`: only what the chosen view accepts is sent. */
    function argsOf(form, offset) {
      const args = { limit: PAGE_SIZE, offset }
      const put = (key, value) => { if (typeof value === 'string' ? value.trim() : value) args[key] = typeof value === 'string' ? value.trim() : value }
      if (form.view === 'rankings') {
        args.domain = 'rankings'
        args.scope = 'full_catalog'
        args.rank = form.rank
        if (['sm', 'mg'].includes(form.rank)) put('grade', form.grade)
        if (SORTABLE[form.rank]) args.rs_sort = SORTABLE[form.rank].includes(form.rsSort) ? form.rsSort : SORTABLE[form.rank][0]
        if (form.rank.startsWith('rs_') && form.rank !== 'rs_ledger') { put('rs_locale', form.language); put('query', form.query) }
        return args
      }
      if (form.view === 'posted') {
        args.domain = 'posted'
        args.scope = 'full_catalog'
        for (const key of ['query', 'theater', 'language', 'account']) put(key, form[key])
        put('posted_state', form.postedState)
        return args
      }
      args.domain = form.view
      args.scope = form.view === 'candidates' ? 'candidate_pool' : 'full_catalog'
      for (const key of ['query', 'theater', 'language']) put(key, form[key])
      put('signal_kind', form.basis)
      put('exclude_posted', form.onlyUnposted)
      put('hot_only', form.onlyHot)
      return args
    }

    async function postQuery(args, signal) {
      const response = await fetch(ROUTES.query, {
        method: 'POST', credentials: 'same-origin', signal,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(args),
      })
      let data = null
      // A proxy or an old plugin build can answer without JSON; the status code then is the message.
      try { data = await response.json() } catch { data = null }
      if (data && typeof data === 'object' && typeof data.status === 'string') return data
      return { status: 'error', code: `http_${response.status}`, message: `HTTP ${response.status}` }
    }

    function StatusLine({ t, state, reload }) {
      if (state.loading) return h('p', { className: 'ggPickMuted' }, t('loading'))
      if (state.error) {
        return h('div', { className: 'ggPickRow' },
          h('p', { role: 'alert' }, t('statusFailed', { error: state.error })),
          h('button', { type: 'button', className: 'ggPickBtn', onClick: reload }, t('retry')))
      }
      const api = state.data.api || {}
      if (!api.configured) return h('p', { className: 'ggPickNotice', role: 'status' }, t('apiNotConfigured', { reason: shown(api.reason) }))
      if (!api.reachable) {
        return h('div', { className: 'ggPickRow' },
          h('p', { className: 'ggPickNotice', role: 'alert' }, t('apiUnreachable', { baseUrl: api.baseUrl, error: api.message || api.error })),
          h('button', { type: 'button', className: 'ggPickBtn', onClick: reload }, t('retry')))
      }
      const catalog = api.data?.catalog
      const mirror = api.data?.mirror
      const parts = [t('apiConnected', { baseUrl: api.baseUrl })]
      if (catalog?.published_at) parts.push(t('catalogAt', { at: when(catalog.published_at) }))
      const mirrorAt = mirror?.current?.published_at
      parts.push(mirrorAt ? t('mirrorAt', { at: when(mirrorAt) }) : t('noMirror'))
      return h('div', { className: 'ggPickRow' },
        h('p', { className: 'ggPickMuted' }, parts.join(' · ')),
        h('span', { className: 'ggPickSpacer' }),
        h('button', { type: 'button', className: 'ggPickBtn', onClick: reload }, t('refresh')))
    }

    function Field({ label, children }) {
      return h('label', { className: 'ggPickField' }, label, children)
    }

    function Filters({ t, form, setForm, busy, onRun }) {
      const set = key => event => setForm(current => ({ ...current, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }))
      const input = (key, hint) => h('input', { type: 'text', value: form[key], placeholder: hint, maxLength: 100, onChange: set(key) })
      const select = (key, options) => h('select', { value: form[key], onChange: set(key) }, options.map(([value, label]) => h('option', { key: value, value }, label)))
      const fields = [h(Field, { key: 'view', label: t('view') }, select('view', VIEWS.map(view => [view, t(`view.${view}`)])))]
      if (form.view === 'rankings') {
        const reelshort = form.rank.startsWith('rs_') && form.rank !== 'rs_ledger'
        fields.push(h(Field, { key: 'rank', label: t('rank') }, select('rank', RANKS)))
        if (['sm', 'mg'].includes(form.rank)) fields.push(h(Field, { key: 'grade', label: t('grade') }, select('grade', [['', t('any')], ...GRADES.map(grade => [grade, grade])])))
        if (SORTABLE[form.rank]) fields.push(h(Field, { key: 'rsSort', label: t('sort') }, select('rsSort', SORTABLE[form.rank].map(sort => [sort, t(`sort.${sort}`)]))))
        if (reelshort) fields.push(h(Field, { key: 'language', label: t('language') }, input('language', t('languageHint'))), h(Field, { key: 'query', label: t('search') }, input('query', t('searchHint'))))
      } else {
        fields.push(
          h(Field, { key: 'theater', label: t('theater') }, input('theater', t('theaterHint'))),
          h(Field, { key: 'language', label: t('language') }, input('language', t('languageHint'))),
          h(Field, { key: 'query', label: t('search') }, input('query', t('searchHint'))))
        if (form.view === 'posted') {
          fields.push(
            h(Field, { key: 'account', label: t('account') }, input('account')),
            h(Field, { key: 'postedState', label: t('postedState') }, select('postedState', [['', t('any')], ...['pub', 'sched', 'none', 'nomatch'].map(state => [state, t(`state.${state}`)])])))
        } else {
          fields.push(
            h(Field, { key: 'basis', label: t('basis') }, select('basis', [['', t('any')], ...RANKS.filter(([code]) => !code.startsWith('rs_'))])),
            h('label', { key: 'onlyUnposted', className: 'ggPickCheck' }, h('input', { type: 'checkbox', checked: form.onlyUnposted, onChange: set('onlyUnposted') }), t('onlyUnposted')),
            h('label', { key: 'onlyHot', className: 'ggPickCheck' }, h('input', { type: 'checkbox', checked: form.onlyHot, onChange: set('onlyHot') }), t('onlyHot')))
        }
      }
      return h('form', { className: 'ggPickForm', 'aria-label': t('filters'), onSubmit: (event) => { event.preventDefault(); onRun() } },
        ...fields,
        h('button', { type: 'submit', className: 'ggPickBtn ggPickBtnPrimary', disabled: busy }, busy ? t('running') : t('run')))
    }

    function basisOf(row, t) {
      const signal = row.kind === 'drama' ? row.signals?.[0] : row.ranking
      if (!signal) return '—'
      const parts = [signal.label || RANK_LABEL[signal.kind] || signal.kind]
      if (signal.grade) parts.push(signal.grade)
      if (Number.isInteger(signal.rank)) parts.push(t('rankNo', { rank: signal.rank }))
      const date = signal.observed_at || signal.evidence_on
      if (date) parts.push(when(date))
      const more = row.kind === 'drama' ? row.signal_count - 1 : 0
      return more > 0 ? `${parts.join(' · ')} (+${more})` : parts.join(' · ')
    }

    function titleCell(row, t) {
      // Only an https link is rendered as one: the URL comes from source data.
      const link = typeof row.detail_url === 'string' && /^https:\/\//u.test(row.detail_url)
      return h('td', { className: 'ggPickTitle' },
        link ? h('a', { href: row.detail_url, target: '_blank', rel: 'noreferrer noopener' }, shown(row.title)) : shown(row.title),
        row.kind === 'catalog_record' && h('div', { className: 'ggPickMuted' }, t('unverified')))
    }

    function Table({ t, rows }) {
      const kind = rows[0].kind
      const head = columns => h('thead', null, h('tr', null, columns.map(column => h('th', { key: column, scope: 'col' }, t(`col.${column}`)))))
      let columns
      let cells
      if (kind === 'posted') {
        columns = ['title', 'theater', 'language', 'posts', 'scheduled', 'lastPost']
        cells = row => [h('td', { key: 't', className: 'ggPickTitle' }, shown(row.title)), h('td', { key: 'p' }, shown(row.platform)), h('td', { key: 'l' }, shown(row.lang)),
          h('td', { key: 'c', className: 'ggPickNum' }, shown(row.post_count)), h('td', { key: 's', className: 'ggPickNum' }, shown(row.sched_count)), h('td', { key: 'd' }, when(row.last_post_on))]
      } else if (kind === 'bill') {
        columns = ['date', 'title', 'language', 'orders', 'clicks']
        cells = row => [h('td', { key: 'd' }, when(row.bill_date)), h('td', { key: 't', className: 'ggPickTitle' }, shown(row.title)), h('td', { key: 'l' }, shown(row.locale)),
          h('td', { key: 'o', className: 'ggPickNum' }, shown(row.order_cnt)), h('td', { key: 'c', className: 'ggPickNum' }, shown(row.same_day_clicks))]
      } else if (kind === 'rule') {
        columns = ['theater', 'name', 'rule']
        cells = row => [h('td', { key: 'p' }, shown(row.platform)), h('td', { key: 'n' }, shown(row.name)), h('td', { key: 'r' }, row.youtube_rule ? t(`rule.${row.youtube_rule}`) : '—')]
      } else {
        const observed = rows.some(row => row.reelshort)
        // The long evidence text goes last so the posted state stays in view in a narrow panel.
        columns = ['title', 'theater', 'language', 'posted', ...(observed ? ['metrics'] : []), 'basis']
        cells = (row) => {
          const rs = row.reelshort
          const posted = row.kind === 'drama' ? t(`posted.${row.posted_status}`) : '—'
          return [
            h(React.Fragment, { key: 't' }, titleCell(row, t)),
            h('td', { key: 'p' }, shown(row.theater)),
            h('td', { key: 'l' }, shown(row.language)),
            h('td', { key: 's' }, row.posted?.post_count > 0 ? `${posted} (${row.posted.post_count})` : posted),
            observed && h('td', { key: 'm' }, !rs ? '—' : rs.metrics_valid === true ? t('metricLine', { rr: shown(rs.rr), promoters: shown(rs.promoters_cnt) }) : t('notComparable')),
            h('td', { key: 'b' }, basisOf(row, t)),
          ]
        }
      }
      return h('div', { className: 'ggPickTableWrap' }, h('table', { className: 'ggPickTable' }, head(columns),
        h('tbody', null, rows.map((row, index) => h('tr', { key: row.identity || row.row_key || `${row.kind}-${index}` }, cells(row))))))
    }

    function Result({ t, view, busy, onPage }) {
      if (!view) return h('p', { className: 'ggPickMuted' }, t('empty'))
      const label = t(view.source === 'model' ? 'fromModel' : 'fromPanel', { at: when(view.at) })
      const data = view.data
      if (data.status === 'rejected') return h('div', null, h('p', { className: 'ggPickMuted' }, label), h('p', { className: 'ggPickNotice', role: 'status' }, t('rejected', { message: data.message })))
      if (data.status !== 'ok') return h('div', null, h('p', { className: 'ggPickMuted' }, label), h('p', { className: 'ggPickNotice', role: 'alert' }, t('queryFailed', { code: shown(data.code), message: shown(data.message) })))
      const facts = [t('summary', { matched: shown(data.counts?.matched), shown: data.rows.length })]
      if (data.request?.rank) facts.push(RANK_LABEL[data.request.rank] || data.request.rank)
      if (data.actual_period) facts.push(t('period', { period: data.actual_period.value || data.actual_period.kind }))
      if (data.source_as_of) facts.push(t('sourceAt', { at: when(data.source_as_of) }))
      if (data.mirror_synced_at) facts.push(t('syncedAt', { at: when(data.mirror_synced_at) }))
      const offset = data.request?.offset || 0
      const next = data.projection?.next_offset
      // Paging re-runs the panel's own form, so it is offered only for a table the panel asked for.
      const pageable = view.source === 'panel' && (offset > 0 || Number.isInteger(next))
      return h(React.Fragment, null,
        h('div', null,
          h('p', { className: 'ggPickMuted' }, label),
          h('p', null, facts.join(' · ')),
          ...(data.warnings || []).map((warning, index) => h('p', { key: index, className: 'ggPickNotice', role: 'status' }, typeof warning === 'string' ? warning : JSON.stringify(warning)))),
        data.rows.length ? h(Table, { t, rows: data.rows }) : h('p', { className: 'ggPickMuted' }, t('noRows')),
        pageable && h('div', { className: 'ggPickRow' },
          h('button', { type: 'button', className: 'ggPickBtn', disabled: busy || offset <= 0, onClick: () => onPage(Math.max(0, offset - PAGE_SIZE)) }, t('prev')),
          h('button', { type: 'button', className: 'ggPickBtn', disabled: busy || !Number.isInteger(next), onClick: () => onPage(next) }, t('next'))))
    }

    const INITIAL_FORM = { view: 'candidates', theater: '', language: '', query: '', basis: '', onlyUnposted: true, onlyHot: false, rank: 'sm', grade: '', rsSort: 'd7', account: '', postedState: '' }

    function PickPanel({ t }) {
      React.useLayoutEffect(ensureStyles)
      const root = React.useRef(null)
      const seen = React.useRef(0)
      const running = React.useRef(null)
      const [status, setStatus] = React.useState({ loading: true })
      const [form, setForm] = React.useState(INITIAL_FORM)
      const [view, setView] = React.useState(null)
      const [busy, setBusy] = React.useState(false)

      const loadStatus = React.useCallback(() => {
        setStatus({ loading: true })
        fetch(ROUTES.status, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
          .then(response => response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`)))
          .then(data => setStatus({ data }), error => setStatus({ error: String(error?.message || error) }))
      }, [])
      React.useEffect(loadStatus, [loadStatus])

      // The model's queries arrive through the plugin, not through this page, so the
      // panel asks for them while it is on screen.
      React.useEffect(() => {
        let stopped = false
        const tick = () => {
          if (stopped || document.visibilityState !== 'visible' || !root.current || root.current.offsetParent === null) return
          fetch(`${ROUTES.recent}?after=${seen.current}`, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
            .then(response => response.ok ? response.json() : null)
            .then((data) => {
              if (stopped || !data) return
              // A restarted plugin counts from zero again.
              if (data.seq < seen.current) { seen.current = 0; return }
              seen.current = data.seq
              const entry = data.entry
              if (entry) setView({ source: 'model', at: entry.at, data: entry.result || { status: 'rejected', ...entry.rejection } })
            })
            // Best effort: the next tick asks again, and the status line is what reports a lost connection.
            .catch(() => {})
        }
        tick()
        const timer = setInterval(tick, POLL_MS)
        return () => { stopped = true; clearInterval(timer) }
      }, [])

      const run = React.useCallback((offset) => {
        running.current?.abort()
        const controller = new AbortController()
        running.current = controller
        setBusy(true)
        postQuery(argsOf(form, offset), controller.signal)
          .then(data => data, error => ({ status: 'error', code: 'request_failed', message: String(error?.message || error) }))
          .then((data) => {
            if (controller.signal.aborted) return
            setBusy(false)
            setView({ source: 'panel', at: new Date().toISOString(), data })
          })
      }, [form])
      React.useEffect(() => () => running.current?.abort(), [])

      return h('div', { className: 'ggPick', ref: root },
        h(StatusLine, { t, state: status, reload: loadStatus }),
        h(Filters, { t, form, setForm, busy, onRun: () => run(0) }),
        h(Result, { t, view, busy, onPage: run }),
        h('p', { className: 'ggPickMuted' }, t('readOnly')))
    }

    function createPanel({ locale }) {
      const t = locale.bind(NS)
      const subscribe = listener => locale.subscribe(listener)
      const snapshot = () => locale.getSnapshot()
      return function Panel() {
        React.useSyncExternalStore(subscribe, snapshot, snapshot)
        return h(Boundary, { message: t('panelFailed') }, h(PickPanel, { t }))
      }
    }

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }))
      ctx.effect(() => ctx.desktopWorkbenches.register({
        title: '选剧台',
        // The workbench identity Desktop derives is the lowercased owner/repository of this URL:
        // the project whose data this workbench reads, not the repository this plugin's source lives in.
        repository: 'https://github.com/phananhson733-oss/ggwork-deerflow',
        description: '用选剧数据找值得发的短剧：评级、榜单、ReelShort 观测与订单、团队发布记录。只读。',
        layout: { businessSide: 'right', businessWidth: 0.5 },
      }, createPanel({ locale: ctx.locale })))
    }

    return { apply, inject: ['desktopWorkbenches', 'locale'], createPanel, argsOf, when, Result }
  },
})
