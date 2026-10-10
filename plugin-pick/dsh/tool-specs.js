// Tool definitions as plain data plus an `execute` that takes its dependencies.
// `index.js` turns each into a Harness tool; the tests call `execute` directly.
import { ApiError } from './api-client.js'
import { MODEL_PAGE_LIMIT, projectForModel } from './projection.js'

// Theater boards are named by their signal kind; the ReelShort boards start with `rs_`.
export const RANKS = ['kd', 'kw', 'qc', 'qr', 'sm', 'smd', 'mg', 'fh', 'sh', 'gh', 'gn', 'ghh', 'dbn', 'rs_rr', 'rs_growth', 'rs_cand', 'rs_pc', 'rs_clk', 'rs_gsc', 'rs_bill', 'rs_ledger']
export const RS_SORTS = ['rr', 'd1', 'd7', 'dp1', 'dp7', 'promoters', 'publish', 'bill', 'eff', 'gsc', 'clicks']
export const GRADES = ['SSS', 'SS', 'S', 'A', 'B', 'C', 'D']

const DATE = /^\d{4}-\d{2}-\d{2}$/u
const text = description => ({ type: 'string', description })
const flag = description => ({ type: 'boolean', description })

export const QUERY_PARAMETERS = {
  domain: { type: 'string', required: true, enum: ['candidates', 'catalog', 'rankings', 'posted', 'rules'], description: '查什么：candidates 选剧候选，catalog 剧库，rankings 榜单（含 ReelShort 观测与订单），posted 团队发布记录，rules 各剧场的发布规则。' },
  scope: { type: 'string', required: true, enum: ['candidate_pool', 'full_catalog'], description: '范围：candidate_pool 运营选剧池，full_catalog 全部剧库。回答里要说明用的是哪个范围。' },
  query: text('剧名或中文剧名的模糊匹配，或来源 ID 的精确匹配。'),
  theater: text('剧场名，如 ReelShort、ShortMax、DramaBox、KalosTV。不是国家或地区。'),
  language: text('语种代码，如 en、es、ja、ko。剧库没有地区字段，按地区找剧只能用语种近似。'),
  channel: { type: 'string', enum: ['youtube', 'tiktok', 'facebook'], description: '发布渠道，用于判断该渠道能不能发。' },
  account: text('团队发布账号名，配合发布记录筛选。'),
  rank: { type: 'string', enum: RANKS, description: '看哪张榜，domain=rankings 时使用。代码含义见 gg-pick-glossary 技能。' },
  grade: { type: 'string', enum: GRADES, description: '评级档位，SSS 最高。只有评级榜（rank=sm 或 mg）有档位。' },
  rs_sort: { type: 'string', enum: RS_SORTS, description: 'ReelShort 榜的排序。涨幅榜 rs_growth 用 d1、d7、dp1、dp7，其他值不生效；实际排序见结果的 effective_sort。' },
  rs_locale: text('ReelShort 榜的语种筛选，如 en、es。'),
  rs_bucket: { type: 'string', enum: ['0-7', '8-30', '31-90', '91-365', '366+'], description: 'ReelShort 榜按上线天数分桶。' },
  signal_kind: text('只要带某类依据的剧，填信号种类代码，如 kd、sm、bill。'),
  tags: { type: 'array', items: { type: 'string' }, description: '题材标签，全部命中才算，最多 20 个。标签是来源原文，先看结果里的 tags 再用。' },
  period_kind: { type: 'string', enum: ['latest', 'daily', 'weekly'], description: '榜单期次：latest 最新一期；daily 指定某天；weekly 指定某周。默认 latest。' },
  period_value: text('期次日期 YYYY-MM-DD。daily 填那一天，weekly 填那一周的周起始日；latest 不填。'),
  exclude_posted: flag('排除团队发布记录里已经发过的剧。'),
  exclude_selected: flag('排除令牌所属账号个人清单里已选的剧。'),
  confirmed_eligible_only: flag('只要来源确认可发的剧。服务端默认 true；传 false 改为只排除明确禁发的。'),
  hot_only: flag('只要有热门依据（剧场榜单、评级、剧单、备注）的剧。'),
  posted_filter: { type: 'string', enum: ['no', 'yes', 'pool'], description: '按发布记录筛：no 未发过，yes 发过，pool 在选剧池。' },
  posted_state: { type: 'string', enum: ['pub', 'sched', 'none', 'nomatch'], description: '发布记录状态：pub 已发，sched 已排期未发，none 未排期，nomatch 剧库未对上。' },
  with_off: flag('把已下架的剧也算进来。'),
  youtube_ok: flag('只要 YouTube 可发的剧。'),
  in_use_only: flag('只看运营在用的剧场。'),
  published_from: text('发布日期下限 YYYY-MM-DD。'),
  published_to: text('发布日期上限 YYYY-MM-DD。'),
  order: { type: 'string', enum: ['evidence_date', 'evidence', 'listed', 'rank', 'title', 'published_at'], description: '排序方式。这是浏览顺序或来源名次，不是对商业价值的预测。' },
  offset: { type: 'integer', description: '从第几条开始，从 0 起。翻页时填上一次结果里 projection.next_offset 的值。' },
  limit: { type: 'integer', description: `返回几条，1 到 ${MODEL_PAGE_LIMIT}，默认 10。` },
}

const PASS_THROUGH = Object.keys(QUERY_PARAMETERS).filter(key => !['period_kind', 'period_value', 'limit', 'offset'].includes(key))

/** Turns tool arguments into the Gateway's `CommonQuery`. Throws before any request when they cannot be one. */
export function queryBody(args = {}) {
  const invalid = message => new ApiError('invalid_arguments', message, 0)
  const body = {}
  for (const key of PASS_THROUGH) if (args[key] !== undefined && args[key] !== null) body[key] = args[key]
  for (const key of ['domain', 'scope']) if (typeof body[key] !== 'string') throw invalid(`${key} is required.`)
  const limit = args.limit ?? 10
  if (!Number.isInteger(limit) || limit < 1 || limit > MODEL_PAGE_LIMIT) throw invalid(`limit must be a whole number from 1 to ${MODEL_PAGE_LIMIT}.`)
  const offset = args.offset ?? 0
  if (!Number.isInteger(offset) || offset < 0) throw invalid('offset must be a whole number from 0.')
  const kind = args.period_kind ?? 'latest'
  if (kind === 'latest') {
    if (args.period_value) throw invalid('period_value needs period_kind daily or weekly.')
  } else if (typeof args.period_value !== 'string' || !DATE.test(args.period_value)) {
    throw invalid(`period_kind ${kind} needs period_value as YYYY-MM-DD.`)
  }
  for (const key of ['published_from', 'published_to']) {
    if (body[key] !== undefined && !DATE.test(body[key])) throw invalid(`${key} must be YYYY-MM-DD.`)
  }
  return { ...body, period: { kind, value: kind === 'latest' ? null : args.period_value }, offset, limit }
}

/**
 * A refusal the Gateway explained is an answer the model can act on, not a broken tool.
 * Sign-in and permission failures are not: no change of conditions gets past them.
 */
const refused = error => error instanceof ApiError && error.explained && ![401, 403].includes(error.status)

export function toolSpecs({ api, describe, onQuery = () => {} }) {
  return [
    {
      name: 'ggpick_workbench_status',
      title: '检查选剧台连接',
      description: '报告选剧台的连接状态：选剧数据接口是否已配置、是否可达，以及当前剧库批次与镜像的数据时点。选剧工具报连接或权限错误时调用，或用户问数据新不新时调用。',
      parameters: {},
      timeoutMs: 15_000,
      async execute() {
        return { ...describe(), api: await api.status() }
      },
    },
    {
      name: 'ggpick_query_data',
      title: '查询选剧数据',
      description: `只读查询选剧台的真实数据：选剧候选、剧库、各剧场榜单与评级、ReelShort 观测与订单、团队发布记录、剧场发布规则。一次最多返回 ${MODEL_PAGE_LIMIT} 条，结果里的 counts 是完整数量，projection.next_offset 用于翻页。返回 status=rejected 表示条件不被接受，按 message 改条件重查，不要当成 0 结果。剧目、数值和发布状态只能来自本工具的结果。`,
      parameters: QUERY_PARAMETERS,
      timeoutMs: 20_000,
      // `record: false` is the panel asking for itself: only the model's queries are remembered.
      async execute(args, { signal, record = true } = {}) {
        const body = queryBody(args)
        let response
        try {
          response = await api.query(body, { signal })
        } catch (error) {
          if (!refused(error)) throw error
          const rejection = { status: 'rejected', code: error.code, message: error.message, retryable: error.retryable }
          if (record) onQuery({ request: body, rejection })
          return rejection
        }
        let projected
        try { projected = projectForModel(response) } catch { throw new ApiError('api_invalid_response', 'Pick API answered with a shape this workbench cannot read.', 200) }
        const result = { status: 'ok', ...projected }
        if (record) onQuery({ request: body, result })
        return result
      },
    },
  ]
}
