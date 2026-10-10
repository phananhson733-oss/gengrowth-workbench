# 后续计划

## 需要先确认的两件事

1. **工作台面板的核心流程。** DSH 的工作台开发规范要求先确认业务场景、目标用户和最小核心流程，再写业务界面。场景和用户已经明确，缺的是流程：进入工作台后，第一步做什么，做完一次任务的标志是什么。现在的面板只是状态页。
2. **许可证。** 仓库是公开的，里面没有 LICENSE 文件。没有许可证时别人能看到代码，但没有得到使用授权。要不要加、加哪一种，需要确认。`vendor/nevermore/` 里的引擎代码和 `plugin/` 里的技能、prompt 都来自 nevermore，也随仓库公开了。

已经定下来的：仓库是 `phananhson733-oss/gengrowth-workbench`，2026-10-10 创建，工作台身份取自这个地址，之后改名或换 owner 会影响会话归属。Vercel 上放的是 `apps/api`，同一天部署，地址和设置见 [README](../README.md) 的「线上 API」。

## 下一步

按依赖顺序排列。

1. 在真实 DSH Desktop 里装上 0.1.2，跑通一次「模型加载技能」和「模型经线上 API 审计内链」。模型调用状态工具已在 0.1.1 上通过，真实数据目录的 `api.json` 已指向线上 API。步骤见 [verification.md](verification.md) 的「在真实 DSH Desktop 里验收」。这是目前最大的未验证项。
2. 搬第二批引擎。建议顺序：
   - 页面可引用性检查、站内 SEO 检查：不需要第三方密钥。
   - SEO 审计：需要先收窄 `@sf/sources` 的入口，否则会带进 121 个文件。
   - 关键词机会、竞品关键词差距、流量下跌诊断：需要 DataForSEO 或 Search Console 凭据，也需要决定凭据存在哪里。
   - AI 可见度检查和 GEO 知识库：在 nevermore 里依赖 Supabase 和后台任务，需要单独设计。
3. Agent 预设和人设：一个「GenGrowth SEO/GEO」预设，把技能、工具和系统提示收在一起，并让它的技能源不再读取 `~/.agents/skills`。
4. 业务面板。等上面「工作台面板的核心流程」确认后开始。
5. nevermore 里 39 个 Agent 相关文件的迁移。它们大多是带 Supabase 鉴权和积分扣减的请求处理器，不能原样搬，要逐个判断哪些逻辑属于引擎。

## 选剧台

0.1.0 是只读的第一版，代码在 `plugin-pick/`。按依赖顺序：

1. 合并 ggwork-deerflow 的 PR #78，并把 Railway 上的 Gateway 部署到包含它的版本。部署走 ggwork-deerflow 自己的发布流程，需要单独确认。
2. 用 `scripts/pick-api-token.mjs` 创建生产环境的 `pick:read` 令牌，在真实 DSH Desktop 里安装并验收。步骤见 [verification.md](verification.md) 的「选剧台 0.1.0」。
3. 用生产数据核对榜单、发布记录、规则三类查询的显示和 `gg-pick-select` 里的查询方法。这三类在本机没有数据，是目前最大的未验证项。
4. 之后再考虑的事，都需要先确认要不要做：
   - 把选中的剧保存到个人清单。这是写操作，需要一个新的令牌权限和确认步骤，ggwork-deerflow 现有规则是 Agent 不持有写权限。
   - 面板按会话区分模型的查询结果。现在所有会话共用最近一次。
   - 面板里显示 ReelShort 的变化量。现在只显示原始指标，变化量由模型在回答里计算并写明。

## 可以清理的旧文件

2026-10-09 手工拷进 `~/.dsh/skills` 和 DSH Desktop 数据目录 `skills/` 的 8 个不带前缀的技能，在插件装好后就是重复内容。建议插件在真实 DSH Desktop 里验证通过后删除。
