# 实测记录

日期：2026-10-10。环境：macOS arm64，DSH Desktop v0.11.1（内置 Harness 0.2.0-rc.2，Node 24.17），插件 0.1.0，其中「0.1.0 在真实会话里暴露的缺陷」一节之后的内容针对 0.1.1。

「安装、加载、激活、界面可见」是不同的状态，下面分开记。

## 验证方式

没有改动真实的 DSH Desktop 数据目录。做法是用已安装的 DSH Desktop 自带的运行时，也就是应用包里的 Helper 以 Node 模式启动应用包内那份打过补丁的 Harness，挂一个隔离的 `DSH_HOME`，再加载 Desktop 自己生成的宿主插件清单。界面在普通浏览器里打开。

这和真实应用的差别：界面不在 Electron 窗口里，没有 preload 桥；数据目录是空的新目录。

## 已实测

| 阶段 | 结果 | 证据 |
| --- | --- | --- |
| 打包 | 通过 | `scripts/pack-plugin.mjs` 检查 tgz 内的入口、补丁文件和 24 个内容文件，并确认没有测试和密钥文件 |
| 经 Desktop 的「添加插件」安装 | 通过 | 填入 tgz 路径后显示「已安装」；磁盘上出现独立 generation 目录，Profile 清单写入了 `generationProjection` |
| 启用 | 通过 | 点「立即启用」后无需重启即生效 |
| 重启后仍加载 | 通过 | 重启沙盒后状态接口照常返回，`--dump-config` 里有本插件的层 |
| 服务端激活 | 通过 | `/api/gengrowth-workbench/status` 无会话时 401，有会话时 200，返回 8 个技能、16 个 prompt、2 个工具。该路由在 `apply` 的最后注册，返回 200 说明前面的注册都没有抛错 |
| 客户端发现 | 通过 | 启动 HTML 的脚本清单里有 `gengrowth-workbench/client.js` |
| 客户端激活 | 通过 | 侧栏切换器出现「GenGrowth SEO/GEO」，切换后面板渲染，控制台无报错 |
| 工作台会话 | 通过 | 在工作台模式下点「在此工作区新建会话」，会话建立 |
| 技能面板 | 通过 | 输入 `/gg-` 列出 24 条，其中 16 条标着「仅用户」 |
| 不加前缀时的同名冲突 | 已复现 | `skillPrefix: ''` 时 `/seo-audit` 显示的是 `~/.agents/skills` 里第三方技能的描述 |
| 原版 Harness 不兼容 | 已复现 | `dsh web` 加载本插件后报 `web boot: 1 entry did not activate`，页面空白 |
| API 构建 | 通过 | `next build` 成功，路由为 `/api/health` 和 `/api/tools/internal-link-audit` |
| API 鉴权 | 通过 | 无令牌和错令牌 401，正确令牌 200；未配置令牌 503（测试覆盖） |
| API 输入防护 | 通过 | 保留域名和回环地址返回 400 `invalid_url` |
| 引擎真实运行 | 通过 | 对 `https://info.cern.ch` 审计，3.9 秒返回 200，结果格式为 `internal_link_audit.v3`。该站只抓到 1 页，证明的是链路通，不是结果丰富 |
| 插件到 API | 通过 | 写入 `api.json` 后，状态接口显示 `reachable: true`，响应里不含令牌 |
| 自动化测试 | 通过 | 插件与脚本 24 个（`node --test`），引擎自带测试加 API 测试 21 个（vitest），`tsc --noEmit` 无错误 |

## 没有实测

- **模型加载技能，以及模型调用内链审计。** 模型调用状态工具已在真实 DSH Desktop 里验证通过，见「0.1.0 在真实会话里暴露的缺陷」一节。写入连接文件并启动本机 API 后，模型再次调用状态工具，返回 `configured: true`、`reachable: true` 和 API 上报的工具列表，说明真实应用里插件到 API 的连接是通的。还没有证据的是：模型加载一个 `gg-*` 技能后按它工作；由模型调用 `gengrowth_internal_link_audit` 完成一次审计。
- **真实的 DSH Desktop 应用，部分完成。** 2026-10-10 使用者经「添加插件」把 0.1.0 装进了真实数据目录。只读核对的结果：generation 目录里 34 个文件与 tgz 逐字节一致；Profile 清单的 bundles 里有本插件；界面存储里出现了本工作台的注册记录，这条记录只会在客户端调用 `desktopWorkbenches.register` 后写入，说明客户端已在真实窗口里激活；安装后日志没有新的警告或错误。没有直接证据的部分：服务端的技能和工具注册只有「没有报错」这一条间接证据，面板的实际样子没有看过。
- **`scripts/dev-desktop.mjs` 的安装路径和界面安装不同。** 脚本用命令行 `plugin add`，不经过 generation 机制。界面安装那条路径是单独手工验证的。
- **Vercel 部署。** 写这一节时还没有部署。2026-10-10 已部署并实测，见「线上 API」一节。
- **Windows 和 Intel Mac。**
- **有实际内链结构的站点。** 唯一一次真实抓取只有 1 页。

## 0.1.0 在真实会话里暴露的缺陷

2026-10-10，使用者在真实 DSH Desktop 里让模型调用 `gengrowth_workbench_status`，两次都失败：

```
tool "gengrowth_workbench_status" returned invalid output: value is not lossless JSON
```

这次调用同时确认了三件之前没有证据的事：`standard` 预设会把插件注册的工具交给模型；模型知道 `gg-*` 技能和另一个工具，说明技能目录和系统提示段已生效；服务端入口确实激活了。

原因：状态结果里 8 个技能条目带着 `relatedSkill: undefined`。Harness 接受工具结果前会先做一次无损 JSON 快照，`undefined` 属性不合格。之前没有发现，是因为同一份数据走 HTTP 状态接口时 `Response.json` 会悄悄丢掉 `undefined`，而单元测试只调用了 `execute`，没有经过 Harness 的结果校验。

0.1.1 的修复：

- 技能摘要里缺失的 `relatedSkill` 直接省略；API 健康信息里缺失的字段同样省略。
- 内链审计在 API 返回 200 但没有结果时报 `api_invalid_response`，不再把空值当成结果。
- 新增 `plugin/test/entry.test.mjs`：用替身上下文运行真实的服务端入口，把每个工具的真实返回值交给 Harness 自己的结果接受函数 `ToolRuntime.prototype.createSuccessResult`。DSH Desktop 没有给 `dsh-tools` 打补丁，所以这就是真实应用里运行的那段代码。修复前这个测试报出与上面逐字相同的错误。同一个文件还检查了 24 个技能加载后的形状，对照 Harness `skill` 工具的封闭输出结构。

升级路径在隔离数据目录里用界面走过一遍：先装 0.1.0 并启用，再用「添加插件」装 0.1.1。界面提示「已安装，下次启动后加载」，Profile 指向新的 generation，但运行中的进程仍报告 0.1.0，点「立即启用」也不会换成新代码。重启后报告 0.1.1。结论：**覆盖安装后必须重启 DSH Desktop。**

0.1.1 随后在真实 DSH Desktop 里验证通过：使用者覆盖安装并重启，磁盘上的 0.1.1 与 tgz 逐字节一致，重启后日志没有报错；模型（`deepseek-flash`）调用 `gengrowth_workbench_status` 成功，返回了版本 0.1.1、来源提交、8 个技能和 `api.configured: false`。模型在转述时把 16 个提示词模板说成了 17 个，清单里是 16 个，属于模型计数错误。

## 0.1.2：可收起的面板

日期：2026-10-10。环境同上，DSH Desktop v0.11.1。验证方式仍是隔离数据目录加应用自带的运行时，界面在普通浏览器里打开。这一版没有装进真实的 DSH Desktop。

| 项目 | 结果 | 证据 |
| --- | --- | --- |
| 安装并加载 | 通过 | 沙盒里状态接口返回版本 0.1.2；「已安装」页签显示本工作台 v0.1.2、运行中 |
| 以自定义框架注册 | 通过 | 切到本工作台后，Desktop 自己的会话列处于隐藏状态，`.dshWbCustomFrame` 的第一个子节点是插件的根节点 |
| 没有会话时的「开始使用」 | 通过 | 显示标题、两个按钮和工作区下拉框；点「在此工作区新建会话」后会话建立，归属记在本工作台，原生会话出现在左侧 |
| 收起和展开 | 通过 | 展开时面板宽 403px（主区域 1120px 的 36%），收起后 40px，会话区从 717px 变为 1080px；按钮的 `aria-expanded` 和提示文字随之变化，焦点留在按钮上 |
| 收起不重挂会话 | 通过 | 先在输入框里打一段草稿，收起再展开：输入框是同一个 DOM 节点，草稿还在；状态页所在的节点也没变，26 条内容都在 |
| 记住选择 | 通过 | 收起后刷新页面，仍是收起；`localStorage` 里的值与界面一致 |
| 切换模式 | 通过 | 切到「会话」后自定义框架隐藏，原生会话回到 Desktop 自己的会话列；切回后会话、草稿和收起状态都在，页面上始终只有一个输入框 |
| 窄布局 | 通过 | 主区域 504px 时面板移到会话下方：收起是 41px 高的一条，展开占 35% 高度并可滚动。打开 Desktop 自带的右侧面板后主区域变成 490px，同样走这个布局 |
| 文案语言 | 通过 | 沙盒界面是中文，面板和「开始使用」显示中文；英文词条由单元测试覆盖，没有在界面里切换过语言 |
| 控制台 | 通过 | 切到工作台后、建会话后各读过一次错误，结束时读过一次全部级别，都是空的 |
| 自动化测试 | 通过 | 插件与脚本 40 个（`node --test`），其中 `plugin/test/client.test.mjs` 10 个是这一版新增的；引擎与 API 21 个（vitest）；`tsc --noEmit` 无错误 |

新增的客户端测试用真实的 React 渲染注册进去的框架，不依赖浏览器。它覆盖：以 `customFrame` 注册、中英文词条的键一致、会话归属的判断、「开始使用」调用的宿主接口、收起状态的读写和存储不可用时的表现，以及 `conversation` 在各状态下都是主区域的第一个子节点。改坏其中四处实现确认过对应的测试会失败：归属判断恒为真、收起时不写存储、`conversation` 换到「开始使用」后面、宿主 store 的方法脱离接收者调用。

没有实测：

- **真实的 DSH Desktop 窗口。** 0.1.2 只在沙盒里跑过。覆盖安装后要重启 DSH Desktop 才会换成新代码。
- **macOS 上收起左侧栏后的窗口按钮避让。** 这依赖 Electron 窗口给页面设置的属性，浏览器里没有。依据是源码：原生会话头部自己读取 `--dsh-frame-leading-clearance`，与工作台框架无关。真实窗口里没有看过。
- **在工作区下拉框里改选另一个工作区。** 沙盒里只有一个工作区。
- **「新建工作区并开始对话」。** 它调用宿主的目录选择器，沙盒里没有点。
- **界面里切换到英文。**
- **深色主题。** 颜色只用了 Desktop 的 `--dsw-alias-*` 变量，按理会跟随主题，但只在浅色下看过。
- **Windows 和 Intel Mac。**

升级 Desktop 后要重新核对的宿主接口：自定义框架组件收到的 `service`、`entry`、`active`、`conversation` 四个属性；`service.getSnapshot()` 里的 `state.sessionBindings`、`state.active`、`ready`、`pending`；`service.currentSession()`、`defaultWorkspace()`、`workspaceVisible()`、`newSession()`、`newWorkspaceSession()`、`run()`；`service.ctx.sessions.list` 和 `service.ctx.workspaces.list`。对照物是 Desktop 安装包里 `dsh-desktop-workbenches/client.js` 的 `Frame` 函数。

## 线上 API（Vercel，2026-10-10）

仓库和 Vercel 项目在这一天创建。真实 DSH Desktop 数据目录里的 `api.json` 也在这一天按使用者的要求改成了线上地址，这是本项目唯一一次直接写真实数据目录。

### 已实测

| 项 | 结果 | 证据 |
| --- | --- | --- |
| GitHub 仓库 | 已创建，公开 | `phananhson733-oss/gengrowth-workbench`，`main` 分支。推送前在全部待提交文件里搜过凭据格式、内网地址、邮箱和本机路径，没有命中 |
| Vercel 项目 | 已创建 | `gengrowth-workbench-api`：Root Directory `apps/api`，Next.js，Node 24.x，已连接上面的仓库 |
| 生产部署 | 通过 | 从首个提交的干净克隆用 CLI 部署，状态 READY，地址 `https://gengrowth-workbench-api.vercel.app` |
| 推送触发部署 | 通过 | 推送第二个提交 `a1c0fce` 到 `main` 后，Vercel 自动建了一次生产部署并变为 READY，GitHub 上该提交的 Vercel 检查为 success，生产域名切到新部署后 `/api/health` 仍是无令牌 401、带令牌 200 |
| 生产域名可直接访问 | 通过 | 返回的是应用自己的 JSON，不是 Vercel 的登录页 |
| 鉴权 | 通过 | `/api/health` 无令牌 401，错令牌 401，正确令牌 200；工具路由无令牌 401。所有响应体里都不含令牌 |
| 输入防护 | 通过 | `http://127.0.0.1/`、`http://169.254.169.254/latest/meta-data/`、`https://example.com` 都返回 400 `invalid_url` |
| 线上引擎真实运行 | 通过 | 审计 `https://info.cern.ch`，2.7 秒返回 200，结果格式 `internal_link_audit.v3`，抓到 1 页。证明 Vercel 的出口网络可用，不证明结果丰富 |
| 插件到线上 API | 通过 | 真实数据目录的 `api.json` 改成线上地址后，用插件自己的 `plugin/dsh/api-client.js` 读这个文件：`configured: true`、`reachable: true`，版本 0.1.0，工具 `internal-link-audit`。文件权限 600 |

### 没有实测

- **运行中的 DSH Desktop。** 上面那一行是插件的客户端模块在独立进程里读真实的 `api.json`，不是 Desktop 自己发出的请求。插件每次调用都重新读这个文件，按代码不需要重启，但没有在窗口里看过面板的显示，也没有让模型再调一次状态工具。
- **模型经线上 API 完成一次内链审计。**
- **预览部署。** `GG_API_TOKEN` 只配在 Production。按代码，预览环境的接口应该全部返回 503，没有实际访问过。
- **耗时长的审计。** 工具路由的 `maxDuration` 是 300 秒。唯一一次线上抓取只有 1 页，没有接近过这个上限。
- **更换线上令牌。** 步骤写在 README 的「线上 API」里，没有走过。

## 在真实 DSH Desktop 里验收

这一步要在真实应用里由使用者操作。模型密钥只存在真实数据目录里，不复制到沙盒。

1. 打包：`pnpm pack:plugin`，得到 `.dev/dist/gengrowth-workbench-<版本>.tgz`。
2. 安装：DSH Desktop 左侧「插件」，右上角「添加插件」，填入 tgz 的完整路径，点「安装」。首次安装点「立即启用」即可，不需要重启。已装过旧版本时，装完要退出并重新打开 DSH Desktop。
3. 验收一，工具调用，不依赖 API：新建会话，让模型调用 `gengrowth_workbench_status`。预期返回一段 JSON：`skills` 列表 8 项，`prompts` 列表 16 项。`api` 一项取决于数据目录里有没有 `api.json`：没有时是 `{ configured: false, reason: "missing", reachable: false }`；已经连上线上 API 时是 `configured: true`、`reachable: true`，外加 API 上报的版本和工具列表。这一步同时证明了插件激活、工具注册和模型调用工具。如果模型说没有这个工具，问题在预设对工具的可见性，不在安装：沙盒里只验证过工具已注册，没有验证过 `standard` 预设会把它交给模型。此时看 `/gg-` 能否列出 24 项，那是插件已加载的独立证据。
4. 验收二，技能加载：输入 `/gg-` 选一个技能，或者直接让模型使用 `gg-on-page-seo`。预期回答按技能里的步骤展开。不带前缀的 `/seo-audit` 仍然是 `~/.agents/skills` 里的第三方技能，不是本插件的。
5. 验收三，引擎：让模型审计一个真实站点的内链。数据目录里的 `api.json` 现在指向线上 API，不需要在本机起服务。保留域名如 `example.com` 会被引擎拒绝，要用真实站点。

   要改用本机 API 时，先把本机的地址和令牌写进真实数据目录，再启动 API：

   ```bash
   node scripts/dev-api-token.mjs --dsh-home "$HOME/Library/Application Support/dsh-desktop/harness"
   ```

   ```bash
   pnpm dev:api
   ```

   插件每次调用都重新读取 `api.json`，写入后不需要重启。这条命令会覆盖 `api.json` 里线上的地址和令牌。线上令牌在 Vercel 里读不出来，所以想保留线上连接，就先把 `api.json` 另存一份（权限保持 600）再运行；没有备份的话，要再连线上只能换一个新令牌，步骤见 README 的「线上 API」。

怎么确认结果：DSH Desktop 的日志只记录警告和错误，成功的调用不会留下日志行。证据是会话里出现工具卡片和结果，加上 `harness.log` 里没有 `gengrowth-workbench` 相关的报错。

## 选剧台 0.1.0（2026-10-10）

环境同上。数据来自本机启动的 ggwork-deerflow Gateway（`feat/pick-pat-read` 分支，SQLite，回环地址），里面是 24 行合成剧库。**这个 Gateway 没有镜像库**，所以榜单、发布记录和规则三类查询在本机只能得到「读不了」的回答。

### 已实测

| 阶段 | 结果 | 证据 |
| --- | --- | --- |
| `pick:read` 令牌的权限边界 | 通过 | 在本机真实 Gateway 上：查询 200，状态 200；写选剧清单、导入、触发同步、读账号信息、删除记忆均为 403；不存在的令牌 401。ggwork-deerflow PR #78 的测试覆盖同样的边界 |
| 令牌脚本 | 通过 | `scripts/pick-api-token.mjs` 对本机 Gateway 登录、创建 `pick:read` 令牌、写出权限 0600 的 `api.json`，输出里没有令牌。密码错误时退出码 1 且不写文件；非 https 的非回环地址被拒绝 |
| 打包 | 通过 | `node scripts/pack-plugin.mjs plugin-pick` 检查 tgz 内的入口、补丁文件和两个技能文件，确认没有测试和密钥文件 |
| 安装与启用 | 通过 | 沙盒里 `plugin add` 两个 tgz；「工作台 → 已安装」同时列出「选剧台 v0.1.0」和「GenGrowth SEO/GEO v0.1.2」，两个开关都是开 |
| 服务端激活 | 通过 | `/api/ggwork-pick-workbench/status` 返回 200，内容含两个工具和两个技能。该路由在工具和技能之后注册 |
| 客户端发现 | 通过 | 合并脚本请求里有 `ggwork-pick-workbench/client.js`，与 `gengrowth-workbench/client.js` 并列 |
| 客户端激活 | 通过 | 侧栏切换器出现「选剧台」，切换后面板在默认布局的右半边渲染，控制台无报错 |
| 面板状态行 | 通过 | 显示「已连接 http://127.0.0.1:18431 · 剧库更新于 … · 没有镜像：榜单、发布记录和规则查不了」，与本机 Gateway 的实际状态一致 |
| 面板查询 | 通过 | 「选剧候选 + 只看未发过」返回 16 行；「全部剧库」返回 22 条中的 20 行，「下一页」给出剩下 2 行，「上一页」可用 |
| 被拒绝的查询 | 通过 | 「榜单」视图查询后，面板显示 Gateway 的原话「此版本没有完整镜像，无法查询历史榜单、规则或发布台账」，不是空表也不是报错 |
| 工作台会话 | 通过 | 点「在此工作区新建会话」，原生会话出现在左侧，面板里已有的结果表保持不变 |
| 技能可见 | 通过 | 会话里输入 `/gg-pick` 列出 `gg-pick-glossary` 和 `gg-pick-select` |
| 面板隐藏时不轮询 | 通过 | 当前是「会话」模式时面板已挂载但不可见，网络记录里没有 `recent` 请求；切到选剧台后开始出现，均为 200 |
| 与 SEO/GEO 工作台并存 | 通过 | 切换器列出「会话」「选剧台」「GenGrowth SEO/GEO」三项；两个工作台来回切换各自渲染，控制台无报错；工作台状态里新会话绑定的身份是 `phananhson733-oss/ggwork-deerflow` |
| 自动化测试 | 通过 | `plugin-pick/test` 39 个（`node --test`）。改坏五处实现确认过对应测试会失败：去掉链接的 https 检查、把所有 HTTP 失败都当成拒绝、去掉字节上限、把面板查询记成模型查询、保留镜像的失败原文 |

`test/entry.test.mjs` 把两个工具的真实返回值交给 Harness 自己的结果校验函数（`ToolRuntime.prototype.createSuccessResult`），覆盖了成功、被拒绝、接口未配置、接口不通四种情况。

### 没有实测

- **模型调用工具。** 沙盒里没有模型密钥，也不从真实数据目录复制。模型是否会调用 `ggpick_query_data`、调用后面板是否在几秒内换成那次结果，都没有在真实会话里看过。依据只有：工具已注册、返回值通过 Harness 的校验、`recent` 接口的行为有测试。
- **榜单、评级、ReelShort 观测与订单、发布记录、规则。** 这些查询需要 PostgreSQL 镜像，本机没有。对应的裁剪逻辑和面板列是按 Gateway 的契约文件写的，测试数据也是按契约手写的，没有用真实回答核对过。用户选的四种选剧方式里，「按评级筛未发过的」「看榜单找在涨的」「看分成和订单」都落在这一类。
- **`gg-pick-select` 里写的查询方法。** 每条都对照了 Gateway 的校验代码，但没有一条在有镜像的环境里执行过。
- **生产 Gateway。** PR #78 还没有合并和部署，生产环境现在不认 `pick:read`，创建不了这种令牌。
- **真实的 DSH Desktop 窗口、深色主题、界面切到英文、Windows 和 Intel Mac。**

### 在真实环境里验收

前提：ggwork-deerflow 的 PR #78 已合并，Railway 上的 Gateway 已部署到包含它的版本。

1. 打包：`pnpm pack:pick`，得到 `.dev/dist-plugin-pick/ggwork-pick-workbench-<版本>.tgz`。
2. 安装：DSH Desktop「插件 → 添加插件」，填入 tgz 的完整路径，安装并启用。
3. 配置令牌，自己在终端里运行，密码不回显：

   ```bash
   node scripts/pick-api-token.mjs --dsh-home "$HOME/Library/Application Support/dsh-desktop/harness"
   ```

4. 切到「选剧台」。状态行应显示已连接和镜像同步时间；显示「没有镜像」说明连到的不是生产数据。
5. 面板里把「查看」换成「榜单」，选「ShortMax 评级」，评级选 S，点查询。预期出现带评级和发布状态的表。这一步验证本机验证不了的那一类查询。
6. 新建会话，说「帮我找 5 部 ShortMax 评级 S 以上、还没发过的英语剧」。预期模型调用 `ggpick_query_data`，回答里有剧名、评级、发布状态和数据时点，面板在几秒内换成它查到的表。

第 5、6 步的结果和预期不一致时，先看面板或工具返回的拒绝说明，再对照 `gg-pick-select` 技能里对应的一节：技能里的查询方法没有在有镜像的环境里跑过，可能需要修正。

### 这一轮踩到的坑

沙盒里重复安装同名同版本的 tgz，pnpm 认为「已是最新」，磁盘上还是旧文件。改了代码不改版本号时，界面看到的一直是旧代码。`scripts/dev-desktop.mjs` 现在会先移除已装的同名包再安装。真实 Desktop 里覆盖安装同一个版本号也会遇到同样的问题，所以改动后要升版本号再打包。

主按钮悬停时文字消失。面板的通用悬停样式把背景换成了浅色，而主按钮的文字是白色。单元测试渲染不出悬停状态，是在沙盒里点完查询、鼠标停在按钮上时看到的。已补上主按钮自己的悬停规则。

## 过程中踩到的坑

沙盒换了全新的数据目录但沿用同一个端口时，侧栏切换器里可能不出现本工作台。原因：Desktop 把「这个本地工作台已经介绍过」记在浏览器的 `localStorage`（键 `dsh-desktop-workbenches.introduced-local.v1`）里，同一个地址下的旧记录让它不再自动添加，而新数据目录里又没有添加记录。删掉这个键再刷新，或者换一个端口。真实应用里数据目录和界面存储是一起保留的，不会遇到。

用浏览器自动化按元素引用点击面板右上角的按钮时，整个界面会向左平移。原因：自动化工具点击前会把目标滚动到视口中央，而 Desktop 的外壳右侧藏着一块 630px 宽的自带面板，外壳虽然不显示滚动条，仍然可以被脚本滚动。按坐标点击不会这样，真实的鼠标点击也不会。

沙盒数据目录最初放在仓库的 `.dev/` 下。经界面安装时，pnpm 从临时目录向上找到了本仓库的 workspace，在仓库根目录执行了安装，往锁文件里写进一个多余的 importer，并且报告「安装成功但包不在磁盘上」。已删除 `node_modules` 重新安装恢复，锁文件已核对。之后沙盒一律放在仓库外，脚本里加了检查。
