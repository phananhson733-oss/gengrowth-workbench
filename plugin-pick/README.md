# 选剧台（ggwork-pick-workbench）

DSH Desktop 的选剧工作台插件。它只读 [ggwork-deerflow](https://github.com/phananhson733-oss/ggwork-deerflow) 的选剧数据：模型在对话里查数据并给出带依据的推荐，面板显示它查到的那张表，也可以直接用筛选条件查。

第一版不能保存、排期或发布。这些操作仍在选剧台网页里做。

## 它提供什么

| 类型 | 名称 | 作用 |
| --- | --- | --- |
| 工具 | `ggpick_query_data` | 查选剧候选、剧库、榜单与评级、ReelShort 观测与订单、发布记录、剧场规则。一次最多 20 条 |
| 工具 | `ggpick_workbench_status` | 报告数据接口是否连通，以及剧库批次和镜像的数据时点 |
| 技能 | `gg-pick-select` | 四种选剧方式的查询方法和回答要求 |
| 技能 | `gg-pick-glossary` | 榜单代码、排序代码、评级、发布状态的对照表 |
| 面板 | 选剧台 | 连接状态、筛选表单、结果表 |

工作台身份是 `phananhson733-oss/ggwork-deerflow`（由 `lib/client.js` 里注册的仓库地址决定）。插件源码放在 gengrowth-workbench 仓库的 `plugin-pick/` 目录。

## 数据从哪里来

插件不连数据库，也不带模型密钥。它持有一个只有 `pick:read` 权限的个人访问令牌，只调用 Gateway 的两个只读接口：

- `POST /api/pick/query`：公共查询
- `GET /api/pick/sync`：数据状态

这个令牌访问其他任何接口都会被 Gateway 拒绝，包括选剧台自己的写接口。`pick:read` 权限由 ggwork-deerflow 的 PR #78 加入，Gateway 部署了包含它的版本后才能创建这种令牌。

配置文件是 `$DSH_HOME/ggwork-pick-workbench/api.json`：

```json
{ "baseUrl": "https://ggwork-deerflow.vercel.app", "token": "dfp_…" }
```

地址必须是 https，或者本机回环地址上的 http。令牌不进补丁文件、不进日志、不发给面板：面板通过 Harness 自己的接口转发查询。

用仓库里的脚本生成这个文件（自己运行，密码在终端里输入，不回显）：

```bash
node scripts/pick-api-token.mjs --dsh-home "$HOME/Library/Application Support/dsh-desktop/harness"
```

## 模型看到的数据

Gateway 的一次查询结果可能有几百 KB。`dsh/projection.js` 把它裁成模型一轮能读完的大小：最多 20 行、48,000 字节、每部剧最多 5 条依据。所有数值按 Gateway 给的原样保留，插件不计算、不排序、不补默认值；被裁掉的行数和下一页的起点写在结果的 `projection` 里。

Gateway 拒绝查询条件时，工具返回 `status=rejected` 和 Gateway 的说明，让模型改条件重查。连接失败、令牌无效或没有权限时工具直接报错。

## 面板

面板放在 Desktop 默认的工作台布局里，占主区域的一半。

- 状态行：是否连上、剧库更新时间、镜像同步时间。
- 筛选：选剧候选、全部剧库、榜单、发布记录四种视图。
- 结果表：模型在对话里每查一次，面板在几秒内换成那次的结果；自己用筛选查的结果可以翻页。

模型最近一次查询只存在插件进程的内存里，重启后清空，多个会话共用同一份。

## 开发

```bash
pnpm install
node --test plugin-pick/test/*.test.mjs
node scripts/pack-plugin.mjs plugin-pick
node scripts/dev-desktop.mjs --plugins plugin,plugin-pick
```

`test/entry.test.mjs` 把每个工具的真实返回值交给 Harness 自己的结果校验函数。新增工具时在这里加用例，不要只测 `execute`。

`test/fixtures/candidates.json` 是本地 Gateway 对 24 行合成剧库的真实回答。榜单、发布记录、规则的测试数据按 Gateway 的契约手写，因为本地没有镜像库。验证记录见仓库的 `docs/verification.md`。
