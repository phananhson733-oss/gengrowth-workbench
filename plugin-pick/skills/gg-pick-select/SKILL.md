---
name: gg-pick-select
description: 用选剧台的真实数据选短剧：按评级和剧场找还没发过的剧、看榜单找在涨的剧、看 ReelShort 预估分成和订单表现，或综合多种依据给出推荐。用户要选剧、找高质量短剧、问某张榜单或某部剧发没发过时使用。
---

# 选剧

你的任务是用 `ggpick_query_data` 查到的真实数据，帮用户挑出值得发的短剧，并把每条推荐的依据写清楚。
这个工具只读：不能保存到清单、不能排期、不能发布。用户要保存或排期时，说明需要到选剧台网页里操作。

代码含义（榜单代码、排序代码、评级、发布状态）在 `gg-pick-glossary` 技能里，遇到不确定的代码先加载它。

## 先分清四种问法

| 用户想要 | 查询域 | 关键条件 |
| --- | --- | --- |
| 某个评级、某个剧场、还没发过的剧 | `rankings`（评级榜）或 `candidates` | 见「按评级和剧场筛未发过的」 |
| 最近在涨的剧 | `rankings` | `rank=rs_growth` 加 `rs_sort` |
| 分成、订单表现好的剧 | `rankings` | `rank=rs_bill` 或 `rs_ledger` |
| 综合判断、给个推荐 | 多次查询 | 见「综合判断」 |

每次调用的条件就是这一次的完整条件，不会沿用上一次。细化时把要保留的条件一起写上。

## 查询域的硬规则

后端会拒绝不符合这些规则的条件，并返回 `status=rejected` 和一句说明。被拒绝时按说明改条件重查，不要把拒绝说成“没有结果”，同一个被拒绝的请求不要原样重试。

`code=source_unavailable` 表示这类数据当前读不了（例如还没有镜像，榜单、发布记录和规则就查不了）。如实告诉用户，不要换着条件硬试。`retryable=true`（如查询超时）可以缩小范围后再试一次。

- `candidates` 和 `catalog`：可以用 `theater`、`language`、`query`、`tags`、`signal_kind`、`hot_only`、`exclude_posted`、`posted_filter`、`exclude_selected`、`youtube_ok`、`in_use_only`、`with_off`。不能用 `rank`、`grade`、`rs_*`、指定期次，也不能用 `order=rank`。`scope=candidate_pool` 只含至少有一条依据的剧，`full_catalog` 是全部剧库。
- `rankings`：必须 `scope=full_catalog`。只接受 `rank`、`grade`、期次、`order`、翻页；ReelShort 榜（`rs_` 开头）另外接受 `query`、`rs_locale`、`rs_bucket`、`rs_sort`。不接受 `theater`、`language`、`exclude_posted`、`posted_filter`、`hot_only`、`tags`、`channel`。榜单本身就对应一个剧场，不需要再传剧场。
- `posted`：必须 `scope=full_catalog`。只接受 `query`、`account`、`published_from`、`published_to`、`theater`、`language`、`posted_state`。
- `rules`：只传 `domain` 和 `scope`，返回各剧场的发布规则。
- 期次：`period_kind=daily` 只适用于 `kd`、`qc`、`qr`；`weekly` 只适用于 `kw`；其他榜只有最新一期。
- `channel` 目前只有 `youtube` 可查，而且不能和 `exclude_posted`、`account`、发布日期一起用。

## 按评级和剧场筛未发过的

评级只存在于两张评级榜：ShortMax（`rank=sm`）和 MoboReels（`rank=mg`）。其他剧场没有评级，用户问“DramaBox 的 S 级”时直接说明这一点，并问是否改看该剧场的其他依据。

1. 查评级榜：`domain=rankings`、`scope=full_catalog`、`rank=sm`（或 `mg`）、`grade=S`。`grade` 是精确匹配。
2. 要“S 级及以上”时不传 `grade`：评级榜默认从 SSS 往下排，从头翻页读到评级低于要求为止。`facets.grades` 给出每个评级有多少部。
3. 每一行的 `posted_status` 说明发布情况：`not_posted` 是发布记录里没有已发的，`posted` 是发过，`unknown` 是资料不足以判断。只保留 `not_posted`，并说明 `unknown` 有几部被排除在外。
4. 一页不够时用 `projection.next_offset` 继续翻，直到凑够用户要的数量或翻完。翻完仍不够就如实说真实数量。

还要叠加语种或题材时，评级榜不接受这些条件，改用候选查询：`domain=candidates`、`theater=ShortMax`、`signal_kind=sm`、`exclude_posted=true`，再加 `language` 或 `tags`。这时评级要从每一行的依据里读：找 `kind` 为 `sm`（或 `mg`）的那条依据的 `grade`，由你按评级筛选并说明是读结果筛的。某一行没有这条依据或没有评级时，说明资料里没有评级，不推测。

## 看榜单找在涨的剧

涨幅只有 ReelShort 有逐日观测。

- `domain=rankings`、`scope=full_catalog`、`rank=rs_growth`，`rs_sort` 四选一（传别的值不会按那个值排，以结果里的 `effective_sort` 为准）：`d1` 销售指标较昨日变化，`d7` 较 7 天前变化，`dp1` 推广人数较昨日变化，`dp7` 推广人数 7 天变化。
- 用 `rs_locale` 限定语种，用 `rs_bucket` 限定上线天数（如 `0-7` 是上线一周内的新剧）。
- 每一行的 `reelshort` 是原始观测值：`rr` 是当前的 30 天销售指标，`s1_rr`、`s7_rr` 是 1 天前和 7 天前的基线，`promoters_cnt` 是当前推广人数，`s1_p`、`s7_p` 是对应基线。变化量由你用当前值减基线算出，并写出两个数。
- `metrics_valid` 不是 `true` 的行，指标不可比较。不要把它当成 0，也不要拿它排序，单独列出。
- 基线缺失（`s1_rr` 或 `s7_rr` 为空）说明观测天数不够，不能说“没有增长”。

其他剧场的“在涨”只能看榜单名次变化：`kd`、`qc`、`qr` 有每日名次，可以用 `period_kind=daily` 加 `period_value` 查两天再比较同一张榜上的名次。不同榜单、不同剧场、不同日期的名次不能互相比较。

## 看分成和订单表现

- 预估分成排行：`rank=rs_bill`。每行的 `reelshort.bill_orders` 是预估订单数，`bill_rank` 是名次，`last_bill_on` 是最近一次有订单的日期。
- 订单对账明细：`rank=rs_ledger`。返回的是逐日订单行（`kind=bill`），只有订单数，没有金额。`bill_totals` 是合计。
- 这些是 ReelShort 的预估值，回答里写明“预估”，不要说成已到账收入。别的剧场没有分成数据。

## 综合判断

用户只说“帮我挑几部好剧”时，不要凭一张榜下结论。

1. 先问清楚或从上下文确定：语种（地区按语种近似并说明）、要几部、要不要排除已发过的。能合理默认的就默认并写在回答里，不为此反复追问。
2. 查两到三种互相独立的依据，例如候选池里有热门依据的未发剧（`domain=candidates`、`scope=candidate_pool`、`hot_only=true`、`exclude_posted=true`、`language=…`），加上相关剧场的评级榜或 ReelShort 的涨幅榜。
3. 把同一部剧在不同查询里的依据并排列出。多种依据同时指向的剧排在前面，只有单一依据的写明只有一种依据。
4. 给出推荐理由时只引用查到的字段，不补充剧情、演员、受众这类数据里没有的内容。

`hot_only=true` 只算剧场榜单、评级、剧单和运营备注；ReelShort 本站的出站、预估订单、搜索匹配不算热门依据。

## 回答必须包含

- 每部剧：剧名、剧场、语种、推荐依据（哪张榜、名次或评级、日期）、发布状态。
- 数据时点：`source_as_of`（来源数据时间）和 `mirror_synced_at`（同步时间）；查了榜单时写 `actual_period`（实际期次，可能与要求的不同）。
- 数量：`counts.matched` 是符合条件的总数，本次只读了其中几条。结果里的 `warnings` 如实转述。
- 你自己做的筛选或计算（按发布状态过滤、算变化量）要说明是在结果上做的。

## 不能说的话

- 发布记录来自运营选剧池。对不上的剧只能说“发布记录里没有”，不能说“从未发布”。
- `theater` 是剧场名，不是国家或地区。用户说美国、北美时用 `language=en`，并说明是按语种近似。
- 排序是来源名次或浏览顺序，不是对收益的预测。不要说“这部一定会爆”。
- 数量不够就说真实数量，不凑数，不用常识补剧名。
- 连接或权限错误（工具直接报错而不是 `rejected`）时调用 `ggpick_workbench_status`，把结果转述给用户，不要向用户索要令牌或密码。
