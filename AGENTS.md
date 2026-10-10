# 项目约定

- 这是独立项目。`nevermore` 和 `dsh-desktop` 是参考来源，不是依赖。需要它们的内容时走 `scripts/sync-content.mjs` 和 `scripts/vendor-nevermore.mjs`，不要手工拷贝。
- `plugin/skills/`、`plugin/prompts/`、`plugin/content.manifest.json`、`vendor/nevermore/` 都是生成物，不手改。要改文案或引擎，改 nevermore 再同步。
- `plugin-pick/`（选剧台）的技能是手写的，可以直接改。它只读 ggwork-deerflow 的选剧数据：不加写工具，查询规则以 Gateway 的回答为准，不在插件里复制。
- 不拷贝任何 `.env*` 或凭据文件。密钥只进 API 的环境变量，插件只持有一个 API 令牌。令牌不打印、不进日志、不进补丁文件。
- 所有自定义都做成插件。不 fork DSH Desktop，不给 Harness 打补丁。
- 插件服务端是纯 JS，运行时不编译。有行为的逻辑放在不依赖 `@deepseek-ai/*` 的模块里，由 `plugin/test` 直接测试；`plugin/dsh/index.js` 只做接线。
- 「安装、加载、激活、界面可见」是不同的状态。交付说明要分开写，并列出没有实测的项。记录写在 `docs/verification.md`。
- 调试用 `scripts/dev-desktop.mjs` 的隔离数据目录。不直接修改真实的 DSH Desktop 数据目录；沙盒目录必须在任何 pnpm workspace 之外。
- 未经明确要求，不提交、不推送、不创建 GitHub 仓库或 Vercel 项目、不部署。
- 文档用中文，代码和注释用英文。
