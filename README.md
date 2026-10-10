# GenGrowth SEO/GEO 工作台

一套私有的 SEO/GEO 工作台。底座是 [DSH Desktop](https://github.com/dataelement/dsh-desktop)，GenGrowth 自己的技能、prompt 和站点工具以插件形式装进去。

这是一个独立项目。`nevermore`（GenGrowth 营销站）和 `dsh-desktop` 都只是参考来源：需要的内容用脚本拷贝过来，不依赖它们的仓库。

## 组成

| 目录 | 内容 |
| --- | --- |
| `plugin/` | DSH 插件，SEO/GEO 工作台本身：技能、prompt 模板、工具、面板 |
| `plugin-pick/` | 第二个 DSH 插件，选剧台：只读查询 ggwork-deerflow 的选剧数据，见 [plugin-pick/README.md](plugin-pick/README.md) |
| `apps/api/` | 工作台 API（Next.js，目标部署在 Vercel）：运行引擎，插件凭一个令牌调用它 |
| `vendor/nevermore/` | 从 nevermore 原样拷贝的引擎代码，脚本生成，不手改 |
| `scripts/` | 同步、打包、本地沙盒脚本 |
| `docs/` | 架构决策、实测记录、后续计划 |

插件不持有任何第三方密钥。DataForSEO、Google 等密钥以后只放在 API 的环境变量里，插件只持有一个访问 API 的令牌。

## 现状（0.1.2）

- 8 个技能和 16 个 prompt 模板，名字统一加 `gg-` 前缀，在会话里输入 `/gg-` 即可看到。
- 2 个工具：`gengrowth_workbench_status`、`gengrowth_internal_link_audit`。
- 工作台面板在会话右侧，目前只是状态页，显示已加载的内容和 API 连接状态。点面板右上角的箭头可以把它收成一条窄栏，再点一次展开，这个选择记在本机。业务面板等核心流程确认后再做，见 [docs/roadmap.md](docs/roadmap.md)。

哪些已经实测、哪些还没有，见 [docs/verification.md](docs/verification.md)。

## 常用命令

需要 Node 24.12 以上和 pnpm 10。

```bash
pnpm install
pnpm test          # 插件单元测试 + 引擎与 API 测试
pnpm typecheck     # API 类型检查
pnpm pack:plugin   # 打出 .dev/dist/gengrowth-workbench-<version>.tgz 并校验内容
pnpm pack:pick     # 打出 .dev/dist-plugin-pick/ggwork-pick-workbench-<version>.tgz 并校验内容
```

从 nevermore 重新同步内容和引擎（`NEVERMORE_DIR` 指向一个干净的 nevermore checkout）：

```bash
NEVERMORE_DIR=~/code/nevermore/dsh-workbench-ref-20261010 pnpm sync:content
NEVERMORE_DIR=~/code/nevermore/dsh-workbench-ref-20261010 pnpm vendor:engines
```

两个脚本都支持 `--check`，只比对不写入。

## 本地开发

在隔离的数据目录里，用已安装的 DSH Desktop 自带的运行时跑插件，不碰真实的 DSH Desktop 数据：

```bash
node scripts/dev-desktop.mjs
```

两个插件一起装进沙盒：

```bash
node scripts/dev-desktop.mjs --plugins plugin,plugin-pick
```

本地起 API，并把同一个令牌交给沙盒：

```bash
node scripts/dev-api-token.mjs --dsh-home ~/.cache/gengrowth-workbench/desktop-home/harness
pnpm dev:api
```

## 装进 DSH Desktop

1. `pnpm pack:plugin`
2. DSH Desktop 左侧「插件」，右上角「添加插件」，填入 tgz 的完整路径，点「安装」，再点「立即启用」。
3. 左侧「工作台」一行的切换器里会出现「GenGrowth SEO/GEO」。

这个插件只能装在 DSH Desktop 里。装进命令行版 Harness（`dsh web`）会让它的网页界面无法启动，原因见 [docs/architecture.md](docs/architecture.md)。

## 选剧台

选剧台是独立安装的第二个插件，对应 ggwork-deerflow 项目。它凭一个只读令牌直接访问 ggwork-deerflow 的 Gateway，不经过 `apps/api`。0.1.0 只读：模型查数据并给出带依据的推荐，面板显示查到的表。

安装方式与上面相同，tgz 用 `pnpm pack:pick` 打出的那个。装好后运行 `node scripts/pick-api-token.mjs --dsh-home <DSH 数据目录>` 配置令牌。生产环境要先部署 ggwork-deerflow 的 PR #78，否则创建不了这种令牌。

## 密钥规则

- 仓库里只有 `*.example`。`.env*` 和 `.dev/` 都被忽略。
- 不从 nevermore 拷贝任何 `.env*` 或凭据文件。
- 令牌只写进文件，不打印，不进补丁文件，不进日志。
