---
name: gg-pick-glossary
description: 选剧台的代码对照表：榜单代码、ReelShort 排序代码、评级档位、发布状态和依据字段的含义。调用 ggpick_query_data 前不确定某个代码该填什么，或读结果时不确定某个字段含义时使用。
---

# 选剧台代码对照

## 榜单代码（`rank` 和 `signal_kind`）

剧场榜单，每张榜只属于一个剧场：

| 代码 | 剧场 | 含义 | 有名次 | 可查历史期次 |
| --- | --- | --- | --- | --- |
| `kd` | KalosTV | 日榜 | 有 | 按天 |
| `kw` | KalosTV | 周热门 | 无 | 按周 |
| `qc` | 鹊娱 | 7 日转化率 Top25 | 有 | 按天 |
| `qr` | 鹊娱 | 7 日总收入 Top25 | 有 | 按天 |
| `sm` | ShortMax | 评级榜 | 无，有评级 | 只有最新 |
| `smd` | ShortMax | 每日推荐 | 无 | 只有最新 |
| `mg` | MoboReels | 评级榜 | 无，有评级 | 只有最新 |
| `fh` | FlickReels | 爆款剧单 | 无 | 只有最新 |
| `sh` | StarShort | 高充值剧单 | 无 | 只有最新 |
| `gh` | GoodShort | 爆款推荐 | 无 | 只有最新 |
| `gn` | GoodShort | 重点推荐 | 无 | 只有最新 |
| `ghh` | GoodShort | 历史高充值 | 无 | 只有最新 |
| `dbn` | DramaBox | 运营备注 | 无 | 只有最新 |

ReelShort 的观测榜（只能用在 `rank`，且 `domain=rankings`）：

| 代码 | 含义 | 可用的 `rs_sort` |
| --- | --- | --- |
| `rs_rr` | 30 天销售指标榜 | 全部 |
| `rs_growth` | 涨幅榜 | `d1`、`d7`、`dp1`、`dp7`；其他值不生效 |
| `rs_cand` | 候选清单 | 全部 |
| `rs_pc` | 推广人数榜 | 不可指定 |
| `rs_clk` | 7 天出站点击榜 | 不可指定 |
| `rs_gsc` | 搜索需求榜 | 不可指定 |
| `rs_bill` | 预估分成榜 | 不可指定 |
| `rs_ledger` | 订单对账明细，只有订单数没有金额 | 不可指定，也不接受 `query`、`rs_locale`、`rs_bucket`、`grade` |

只能用在 `signal_kind` 的 ReelShort 本站依据：`clk` 近 7 天有出站点击，`bill` 有预估订单，`gsc` 有搜索匹配。它们不算“热门依据”。

## ReelShort 排序（`rs_sort`）

| 代码 | 含义 |
| --- | --- |
| `rr` | 30 天销售指标（默认） |
| `d1` | 销售指标较昨日净变化 |
| `d7` | 销售指标较 7 天前净变化 |
| `dp1` | 推广人数较昨日变化 |
| `dp7` | 推广人数 7 天变化 |
| `promoters` | 推广人数 |
| `publish` | 上线日期 |
| `bill` | 预估分成 |
| `eff` | 销售指标除以推广人数 |
| `gsc` | 搜索需求信号 |
| `clicks` | 7 天出站点击 |

结果里的 `effective_sort` 是后端实际使用的排序；它和你传的 `rs_sort` 不一样时，以它为准并在回答里说明。

上线天数分桶 `rs_bucket`：`0-7`、`8-30`、`31-90`、`91-365`、`366+`。

## 评级（`grade`）

从高到低：`SSS`、`SS`、`S`、`A`、`B`、`C`、`D`。只有 ShortMax（`sm`）和 MoboReels（`mg`）的评级榜有评级。评级是剧场自己给的，两个剧场之间的评级不能直接比较。

## 发布状态

查询条件：

| 参数 | 值 | 含义 |
| --- | --- | --- |
| `exclude_posted` | `true` | 排除发布记录里已发的剧 |
| `posted_filter` | `no` / `yes` / `pool` | 未发过 / 发过 / 在运营选剧池里 |
| `posted_state`（仅 `domain=posted`） | `pub` / `sched` / `none` / `nomatch` | 已发 / 已排期未发 / 未排期 / 剧库未对上 |

结果字段：

| 字段 | 含义 |
| --- | --- |
| `posted_status` | `posted` 发过，`not_posted` 发布记录里没有已发的，`unknown` 资料不足 |
| `posted_scope_complete` | `false` 表示这次判断用的发布明细不完整，结论要打折说 |
| `posted.post_count` / `sched_count` | 已发条数 / 已排期未发条数 |
| `posted.last_post_on` | 最近一次发布日期 |

“没选过”（`exclude_selected`，个人清单）和“没发过”（`exclude_posted`，团队发布记录）是两回事，不能互相代替。

## 结果行的种类（`kind`）

| `kind` | 含义 |
| --- | --- |
| `drama` | 一部可核对的剧，带 `identity`、依据 `signals`、发布状态 |
| `catalog_record` | 来源里有这条记录，但后端没有给它候选身份。只能当作“来源里有这条”，可发与否未知；在榜单里时名次和评级在 `ranking` |
| `posted` | 一条发布记录（`domain=posted`） |
| `bill` | 一条订单对账行（`rank=rs_ledger`） |
| `rule` | 一个剧场的发布规则（`domain=rules`）；`youtube_rule`：`ok` 可发，`only` 仅清单内可发，`warn` 需留意，`no` 禁发 |

## 依据（`signals`）字段

`kind` 榜单代码，`label` 榜单名，`observed_at` 观测日期或期次，`rank` 名次，`grade` 评级，`value` 来源给出的数值，`note` 来源备注。查询指定了 `rank` 或 `signal_kind` 时，对应的那条依据排在第一位。每行最多带 5 条，`signal_count` 是这部剧的依据总数。

## 可发性字段

`availability`：`active` 在架，`delisted` 已下架，`unknown` 来源没说。
`channel_rules.youtube`：`allowed` 来源确认可发，`denied` 明确禁发，`unknown` 没有确认。为空或 `unknown` 时说“资料里没有”，不推测。
