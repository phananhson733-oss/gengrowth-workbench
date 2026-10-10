# 架构决策

记录每个决定和它的依据。标注「实测」的结论在 [verification.md](verification.md) 里有对应证据。

## 1. 用插件扩展，不 fork DSH Desktop

DSH Desktop 是 Electron 宿主，内部是打了 27 个补丁的 DeepSeek Harness（`@deepseek-ai/dsh@0.2.0-rc.2`，开发者预览版）。fork 意味着每次上游发版都要合并、重建、重新签名。

工作台是 DSH 官方支持的插件类型：一个 npm 包，声明 `dsh.bundle.patch` 和 `dsh.client`，客户端调用 `desktopWorkbenches.register()`。只在本机自用时不需要公开代码，也不需要上架。

如果以后确实需要改宿主（品牌、默认配置、默认内置本插件），`plugin/` 可以原样放进 fork 的 `packages/` 目录，现在的代码不用改。

## 2. 引擎放在 API 里，插件保持很薄

- Harness 在运行时直接加载 JS 插件，不编译 TypeScript。nevermore 的引擎是 TS 源码，直接进插件就得从第一天起维护打包流程。放进 Next.js 由它编译。
- 引擎要访问 DataForSEO、Google Search Console、GA4。这些密钥放在服务端环境变量里，比放在每台装了 DSH 的机器上好管。
- 插件里的工具只做一件事：带令牌请求 API，把结果交给模型。

API 默认拒绝服务：没有配置令牌时返回 503，不会变成「无需令牌」。

DSH 自身不能部署到 Vercel。Harness 是一个长驻进程，状态存在本地磁盘（`DSH_HOME`），不是无服务器函数的形态。所以 Vercel 上放的是这个 API。2026-10-10 起它部署在 Vercel 项目 `gengrowth-workbench-api`，项目设置和连接方式见 [README](../README.md) 的「线上 API」。

## 3. 引擎代码原样拷贝，保留 `@sf/*` 包名

`scripts/vendor-nevermore.mjs` 只拷贝入口文件的 import 闭包，路径和包名都不变，源文件一个字节都不改。生成的只有各包的 `package.json` 和 `PROVENANCE.json`（来源 commit 和每个文件的哈希）。

好处是以后重新同步就是覆盖，`--check` 能发现任何手改或上游变化。

第一个引擎选的是内链审计：闭包只有 24 个源文件，唯一的外部依赖是 `undici`，不需要任何密钥。SEO 审计引擎的闭包是 121 个文件，因为它经由 `@sf/sources` 的总入口把 DataForSEO 和全部契约都带了进来，搬之前需要先收窄入口。

## 4. 技能名加 `gg-` 前缀（实测）

Harness 的技能注册表是分层的：全局层加上每个 Agent 预设自己的层，离会话更近的层直接胜出，rank 只在同一层内比较。

本插件注册在全局层，而读取 `~/.agents/skills` 的文件系统技能源挂在预设层。实测结果：不加前缀时，`/seo-audit` 解析到的是 `~/.agents/skills` 里第三方的同名技能，不是 GenGrowth 的版本。

所以默认前缀是 `gg-`。它还带来一个好处：输入 `/gg-` 就能在一百多个第三方技能里筛出全部 GenGrowth 条目。前缀是插件配置项 `skillPrefix`，可以改。

## 5. prompt 模板只给用户调用

16 个 prompt 是带 `{{变量}}` 的模板。它们注册成技能，但 `modelInvocable` 为 false：用户按名字调用，模型不会自己选。否则每一轮对话的技能目录里都要多付 16 条描述的 token。

## 6. API 地址和令牌放在数据目录的 `api.json`

位置是 `$DSH_HOME/gengrowth-workbench/api.json`。不放在补丁文件里，因为补丁层会被 `--dump-config` 原样打印，也会被复制进诊断信息。明文 HTTP 只允许回环地址。

以后可以换成 DSH 的凭据存储加一张设置卡片，这是面板阶段的事。

## 7. 这个插件只能装在 DSH Desktop 里（实测）

客户端依赖 Desktop 提供的 `desktopWorkbenches` 服务。装进原版 Harness 时，网页界面启动会报 `web boot: 1 entry did not activate`，整个页面起不来。这是工作台插件的共性，不是本插件的缺陷。

## 8. 本地沙盒必须放在仓库外面（实测）

Desktop 安装插件时先装到一个临时的 generation 目录，那个目录没有自己的 `pnpm-workspace.yaml`。如果沙盒的数据目录在某个 pnpm workspace 里面，pnpm 会一路向上找到那个 workspace 并在那里安装，结果是装错地方并污染该 workspace 的锁文件。

`scripts/dev-desktop.mjs` 默认用 `~/.cache/gengrowth-workbench/desktop-home`，并拒绝任何位于 pnpm workspace 内的目录。

## 9. 工作台身份

Desktop 用注册时的 GitHub 仓库地址推导工作台身份，取小写的 `owner/repository`。当前写的是 `phananhson733-oss/gengrowth-workbench`，仓库已在 2026-10-10 按这个名字创建。会话归属记在这个身份上，所以之后给仓库改名或换 owner，要同时考虑已有会话的归属。

## 10. 面板用自定义框架，为了能收起（实测）

Desktop 的默认工作台框架总是在会话旁边显示业务列，宽度下限是主区域的 25%，没有收起入口。要收起只能在注册时声明 `customFrame: true`，由插件自己排布主区域。0.1.2 起这样做，代价和约束如下。

- **「开始使用」要自己提供。** 自定义框架下 Desktop 会隐藏自己的会话列，连同里面「新建工作区并开始对话」「在此工作区新建会话」那一块。插件用同样的宿主调用重做了这一块：`newWorkspaceSession()`、`newSession(workspaceId)`、`defaultWorkspace()`、`workspaceVisible()`，失败经 `service.run()` 进 Desktop 自己的提示条。
- **会话归属按宿主的规则判断。** Desktop 传进来的 `conversation` 节点只有在「主视图里的会话归属本工作台」时才可见，判断式是 `state.sessionBindings[service.currentSession()] === entry.id`。插件用同一个判断式决定显示会话还是显示「开始使用」，两边不会各说各的。
- **`conversation` 的位置固定。** 它在所有状态下都是同一个父元素的第一个子节点。位置一变 React 就会重新挂载原生输入框，没发出去的草稿会丢。
- **不加顶栏。** 开发规范允许自定义框架把 `<header>` 放在根节点第一位，由 Desktop 负责 macOS 窗口按钮的避让。这里没有用：原生会话头部自己读取 `--dsh-frame-leading-clearance` 做避让，再加一条顶栏会多占一行并且出现两层头部。收起按钮放在面板自己的头部，收起后面板缩成 40px 的窄栏，按钮留在原位。
- **面板出错不能连累会话。** 自定义框架整体出错时 Desktop 会把整个框架换成一条错误提示，停靠在里面的会话也一起消失。所以状态页和「开始使用」各自包在插件自己的错误边界里。
- **窄的时候上下排。** 插件根节点是一个 CSS 容器，主区域不超过 520px 时面板移到会话下方，最高占 35%。Desktop 自带的右侧面板打开后主区域会变窄，这时也走这个布局。
- **文案跟随 Desktop 的语言。** 中英文两套词条通过宿主的 `locale` 服务注册。
- **收起状态存在 `localStorage`。** 键名是 `gengrowth-workbench:panel-collapsed`。它只是本机的界面偏好，读写失败时面板照常工作，只是不记忆。

这段实现依赖几个开发规范正文没有写明的宿主接口：`service.getSnapshot()` 返回的 `state.sessionBindings`、`ready`、`pending`，`service.currentSession()`，以及 `service.ctx.sessions.list` 和 `service.ctx.workspaces.list`。它们取自 Desktop v0.11.1 的默认框架实现。升级 Desktop 后要对照新版本的默认框架重新核对，核对项见 [verification.md](verification.md)。

## 11. 选剧台是同一个仓库里的第二个插件包

选剧台（`plugin-pick/`，包名 `ggwork-pick-workbench`）和 SEO/GEO 工作台是两个互相独立的插件，各自安装、各自启停。它们放在同一个仓库是为了共用打包、沙盒脚本和测试约定，不共享运行时代码：DSH 的客户端入口是单文件、不经构建，两个包之间没有可以引用的公共模块。

工作台身份不取决于源码放在哪里。Desktop 只看 `register()` 传入的仓库地址，选剧台写的是 `https://github.com/phananhson733-oss/ggwork-deerflow`，身份就是 `phananhson733-oss/ggwork-deerflow`。`package.json` 的 `repository` 字段指向本仓库的 `plugin-pick/` 目录，只说明源码位置。

`plugin-pick/skills/` 是手写的，不是从 nevermore 生成的，可以直接改。

## 12. 选剧台直连 Gateway，不经过 `apps/api`

SEO/GEO 工具的引擎在 `apps/api` 里跑，是因为引擎本身要有地方运行。选剧数据的引擎已经在 ggwork-deerflow 的 Gateway 里，再加一层转发只会多一个要部署和鉴权的服务。所以选剧台插件直接调用 Gateway。

鉴权用 Gateway 的个人访问令牌。原有的令牌权限里没有能读选剧数据的，所以在 ggwork-deerflow 加了一个只绑定路由的权限 `pick:read`（PR #78）：带这个权限的令牌只能访问 `POST /api/pick/query` 和 `GET /api/pick/sync`，访问其他接口一律 403。这样插件拿到的是一个泄露了也只能读选剧数据的令牌，不是账号密码或会话 Cookie。

令牌放在 `$DSH_HOME/ggwork-pick-workbench/api.json`，理由与第 6 节相同。地址只接受 https，或回环地址上的 http；请求不跟随重定向，避免令牌被带到别的地址。

## 13. 交给模型的是有上限的裁剪，不是重做一遍后端的投影

Gateway 自己有一套给模型用的结果投影（`query_model_projection.py`），里面包含只在 Gateway 内部成立的校验引用和数值比较。把它移植到插件里，等于维护第二份会和后端悄悄走样的业务逻辑。

`plugin-pick/dsh/projection.js` 只做裁剪：最多 20 行、48,000 字节、每部剧 5 条依据，并去掉内部引用字段。数值原样保留，不计算、不排序、不补默认值。被裁掉多少、下一页从哪里开始，写在结果的 `projection` 里。榜单结果按后端给出的 `row_keys` 顺序读取，这个顺序就是榜单顺序。

查询条件是否合法由 Gateway 判断。插件不复制这些规则，只把 Gateway 的拒绝说明原样交给模型（`status=rejected`），由模型改条件重查。规则的文字说明写在 `gg-pick-select` 技能里，供模型少走弯路；技能与后端不一致时以后端的拒绝为准。

## 14. 选剧台面板用 Desktop 的默认布局

选剧台不需要收起面板，所以没有用第 10 节的自定义框架，注册时只声明 `layout: { businessSide: 'right', businessWidth: 0.5 }`。会话区、「开始使用」和窗口按钮避让都由 Desktop 负责，插件只渲染右侧面板，依赖的宿主接口比 SEO/GEO 面板少得多。

面板不持有令牌。它调用插件在 Harness 上注册的三个接口，由插件服务端带着令牌去访问 Gateway：

| 接口 | 作用 |
| --- | --- |
| `GET /api/ggwork-pick-workbench/status` | 连接状态和数据时点 |
| `POST /api/ggwork-pick-workbench/query` | 面板自己的查询，走和模型工具同一段代码 |
| `GET /api/ggwork-pick-workbench/recent` | 模型最近一次查询的结果 |

模型的查询发生在插件服务端，页面收不到通知，所以面板可见时每 4 秒问一次 `recent`。这份结果只放在插件进程的内存里：它是剧库数据，不应该落到本机磁盘上，重启后清空也没有损失。多个会话共用一份，面板显示的是最近一次，不区分会话。
