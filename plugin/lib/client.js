// Client entry for DSH Desktop. One file, no build step: it only uses what the
// shared module baseline provides (React), the host locale service and the
// workbench host service.
//
// The workbench takes Desktop's custom frame so its side panel can be collapsed:
// the default frame always shows a business column at a quarter of the main area
// or more. In a custom frame Desktop hides its own conversation column, so this
// file docks the native conversation itself and offers the start actions Desktop
// would otherwise show while no session belongs to the workbench.
//
// The side panel is still a status view, not the product UI. It shows what the
// plugin loaded so an install can be checked from the app itself.
window.__ModuleLoader__.load({
  id: 'gengrowth-workbench',
  factory: (require) => {
    const React = require('react')
    const h = React.createElement
    const NS = 'gengrowth-workbench'
    const STATUS_PATH = '/api/gengrowth-workbench/status'
    const COLLAPSED_KEY = 'gengrowth-workbench:panel-collapsed'
    const STYLE_ID = 'gg-wb-styles'

    const en = {
      panelLabel: '{title} panel',
      collapsePanel: 'Collapse panel',
      expandPanel: 'Expand panel',
      panelFailed: 'This panel could not be shown. The conversation is not affected.',
      loading: 'Loading…',
      statusFailed: 'Could not read the workbench status: {error}',
      retry: 'Retry',
      refresh: 'Refresh',
      version: 'Version {version}',
      tools: 'Tools',
      skills: 'Skills',
      prompts: 'Prompt templates',
      apiNotConfigured: 'API not configured ({reason}).',
      apiUnreachable: 'API configured at {baseUrl} but not reachable ({error}).',
      apiReachable: 'API reachable at {baseUrl}.',
      apiReachableVersion: 'API reachable at {baseUrl} (v{version}).',
      startTitle: 'Get started with {title}',
      startHint: 'Create a workspace and start a session, or use an existing workspace. New sessions are linked to this workbench.',
      startCreate: 'Create workspace and start session',
      chooseWorkspace: 'Choose workspace',
      chooseExisting: 'Choose an existing workspace',
      usingWorkspace: 'Using workspace: {title}',
      noWorkspace: 'Choose or create a project folder to start a session.',
      startHere: 'New session in this workspace',
    }
    const zh = {
      panelLabel: '{title} 面板',
      collapsePanel: '收起面板',
      expandPanel: '展开面板',
      panelFailed: '这个面板暂时无法显示，会话不受影响。',
      loading: '正在读取…',
      statusFailed: '无法读取工作台状态：{error}',
      retry: '重试',
      refresh: '刷新',
      version: '版本 {version}',
      tools: '工具',
      skills: '技能',
      prompts: 'Prompt 模板',
      apiNotConfigured: 'API 未配置（{reason}）。',
      apiUnreachable: 'API 已配置为 {baseUrl}，但无法连接（{error}）。',
      apiReachable: 'API 可连接：{baseUrl}。',
      apiReachableVersion: 'API 可连接：{baseUrl}（v{version}）。',
      startTitle: '开始使用 {title}',
      startHint: '可以直接新建工作区并开始对话，也可以使用已有工作区。新会话会自动关联这个工作台。',
      startCreate: '新建工作区并开始对话',
      chooseWorkspace: '选择工作区',
      chooseExisting: '选择已有工作区',
      usingWorkspace: '将使用工作区：{title}',
      noWorkspace: '选择或新建一个项目文件夹，即可创建工作区并开始对话。',
      startHere: '在此工作区新建会话',
    }

    // Colours come from Desktop's --dsw-alias-* tokens so both themes follow the host.
    // .ggWbMain repeats the size and container rules of Desktop's own conversation
    // column: the native conversation must lay out here exactly as it does there.
    const css = `
      .ggWb{display:flex;flex:1;min-width:0;min-height:0;height:100%;container-type:inline-size;container-name:gg-workbench}
      .ggWb [hidden]{display:none!important}
      .ggWbLayout{display:flex;flex:1;min-width:0;min-height:0}
      .ggWbMain{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;overflow:hidden;container-type:inline-size;container-name:workbench-conversation}
      .ggWbSide{flex:none;display:flex;flex-direction:column;box-sizing:border-box;width:36%;min-width:220px;min-height:0;border-left:1px solid var(--dsw-alias-border-l2);font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary)}
      .ggWbSide[data-collapsed=true]{width:40px;min-width:40px}
      .ggWbSideHeader{flex:none;display:flex;align-items:center;gap:8px;box-sizing:border-box;min-height:40px;padding:6px 6px 6px 16px}
      .ggWbSide[data-collapsed=true] .ggWbSideHeader{justify-content:center;padding:6px}
      .ggWbTitle{flex:1;min-width:0;margin:0;font-size:13px;line-height:20px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .ggWbToggle{flex:none;display:grid;place-items:center;width:28px;height:28px;padding:0;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}
      .ggWbToggle:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
      .ggWbToggle:focus-visible,.ggWbBtn:focus-visible,.ggWbStart select:focus-visible{outline:2px solid var(--dsw-alias-label-primary);outline-offset:2px}
      .ggWbSide[data-collapsed=true] .ggWbToggle svg{transform:rotate(180deg)}
      .ggWbSideBody{flex:1;min-height:0;overflow:auto}
      .ggWbMuted{margin:0;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:1.65}
      .ggWbAlert{margin:0;padding:16px;font-size:13px;line-height:1.65}
      .ggWbBtn{font:inherit;font-size:13px;line-height:20px;color:inherit;padding:5px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-layer-1);white-space:nowrap;cursor:pointer}
      .ggWbBtn:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2)}
      .ggWbBtn:disabled{cursor:default;color:var(--dsw-alias-label-secondary)}
      .ggWbBtnPrimary:not(:disabled){background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground);border-color:transparent}
      .ggWbBtnPrimary:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover,var(--dsw-alias-button-primary-fill))}
      .ggWbStart{display:flex;flex-direction:column;align-items:flex-start;gap:12px;box-sizing:border-box;max-width:650px;max-height:100%;margin:auto;padding:32px;overflow:auto;font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary)}
      .ggWbStart h2{margin:0;font-size:21px;line-height:1.4}
      .ggWbStart select{font:inherit;font-size:13px;color:inherit;max-width:100%;padding:9px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1)}
      @container gg-workbench (max-width:520px){
        .ggWbLayout{flex-direction:column}
        .ggWbSide{width:100%;min-width:0;max-height:35%;border-left:0;border-top:1px solid var(--dsw-alias-border-l2)}
        .ggWbSide[data-collapsed=true]{width:100%;min-width:0}
        .ggWbSide[data-collapsed=true] .ggWbSideHeader{justify-content:flex-end}
        .ggWbToggle svg{transform:rotate(90deg)}
        .ggWbSide[data-collapsed=true] .ggWbToggle svg{transform:rotate(-90deg)}
      }
    `
    // Desktop can replace the document head during a live client rebuild, so the
    // frame restores the sheet whenever it renders instead of installing it once.
    function ensureStyles() {
      if (document.getElementById(STYLE_ID)) return
      const style = document.createElement('style')
      style.id = STYLE_ID
      style.textContent = css
      document.head.appendChild(style)
    }

    // Whether the side panel is collapsed is a per-machine convenience, kept in
    // localStorage and shared by every render of the frame.
    function createCollapseStore(getStorage) {
      const listeners = new Set()
      let collapsed = false
      // Storage can be unavailable or throw (blocked site data, private window);
      // the panel then starts expanded.
      try { collapsed = getStorage()?.getItem(COLLAPSED_KEY) === 'true' } catch {}
      return {
        subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener) },
        getSnapshot: () => collapsed,
        set(value) {
          collapsed = value === true
          // Same failure as above: the choice still applies until the page reloads.
          try { getStorage()?.setItem(COLLAPSED_KEY, String(collapsed)) } catch {}
          for (const listener of listeners) listener()
        },
      }
    }

    // Desktop replaces a failed custom frame with an error notice, and the docked
    // conversation goes with it. Everything except the conversation renders inside
    // this boundary so a broken panel cannot take the conversation down.
    class Boundary extends React.Component {
      state = { failed: false }
      static getDerivedStateFromError() { return { failed: true } }
      render() { return this.state.failed ? h('p', { role: 'alert', className: 'ggWbAlert' }, this.props.message) : this.props.children }
    }

    const styles = {
      root: { display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 16px 16px' },
      heading: { margin: 0, fontSize: 15, fontWeight: 600 },
      list: { margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 },
      item: { fontSize: 13, lineHeight: 1.45 },
      code: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12 },
    }

    function apiLine(api, t) {
      if (!api) return '…'
      if (!api.configured) return t('apiNotConfigured', { reason: api.reason })
      if (!api.reachable) return t('apiUnreachable', { baseUrl: api.baseUrl, error: api.error })
      return api.version ? t('apiReachableVersion', { baseUrl: api.baseUrl, version: api.version }) : t('apiReachable', { baseUrl: api.baseUrl })
    }

    function Section({ title, items }) {
      return h('section', null,
        h('h3', { style: styles.heading }, `${title} (${items.length})`),
        h('ul', { style: styles.list }, items.map(item => h('li', { key: item.name, style: styles.item },
          h('span', { style: styles.code }, item.name), item.description || item.title ? ` — ${item.description || item.title}` : ''))))
    }

    function StatusPanel({ t }) {
      const [state, setState] = React.useState({ loading: true })
      const load = React.useCallback(() => {
        setState({ loading: true })
        fetch(STATUS_PATH, { headers: { Accept: 'application/json' } })
          .then(response => response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`)))
          .then(data => setState({ data }), error => setState({ error: String(error?.message || error) }))
      }, [])
      React.useEffect(load, [load])

      if (state.loading) return h('div', { style: styles.root }, h('p', { className: 'ggWbMuted' }, t('loading')))
      if (state.error) {
        return h('div', { style: styles.root },
          h('p', { role: 'alert', style: styles.item }, t('statusFailed', { error: state.error })),
          h('div', null, h('button', { type: 'button', className: 'ggWbBtn', onClick: load }, t('retry'))))
      }
      const { data } = state
      return h('div', { style: styles.root },
        h('div', null,
          h('p', { className: 'ggWbMuted' }, t('version', { version: data.version })),
          h('p', { className: 'ggWbMuted' }, apiLine(data.api, t))),
        h(Section, { title: t('tools'), items: data.tools }),
        h(Section, { title: t('skills'), items: data.skills }),
        h(Section, { title: t('prompts'), items: data.prompts }),
        h('div', null, h('button', { type: 'button', className: 'ggWbBtn', onClick: load }, t('refresh'))))
    }

    // The same choices and the same host calls as Desktop's default frame, which a
    // custom frame hides. Failures surface in Desktop's notice through service.run.
    function StartSession({ service, entry, host, t }) {
      const workspaces = service.ctx.workspaces.list
      // Host stores read `this`, so they are never handed to React unbound.
      const subscribe = React.useCallback(listener => workspaces.subscribe(listener), [workspaces])
      const snapshot = () => workspaces.getSnapshot()
      const { items } = React.useSyncExternalStore(subscribe, snapshot, snapshot)
      const [workspaceId, setWorkspaceId] = React.useState('')
      const visible = items.filter(item => service.workspaceVisible(item.workspaceId, host.state.active))
      const chosen = visible.find(item => item.workspaceId === workspaceId) || service.defaultWorkspace()
      const disabled = !host.ready || host.pending > 0 || service.blocked === true
      return h('section', { className: 'ggWbStart' },
        h('h2', null, t('startTitle', { title: entry.title })),
        h('p', { className: 'ggWbMuted' }, t('startHint')),
        h('button', { type: 'button', className: `ggWbBtn ggWbStartCreate${chosen ? '' : ' ggWbBtnPrimary'}`, disabled, onClick: () => service.run(service.newWorkspaceSession()) }, t('startCreate')),
        visible.length > 0 && h('select', { 'aria-label': t('chooseWorkspace'), value: chosen?.workspaceId || '', disabled, onChange: event => setWorkspaceId(event.target.value) },
          h('option', { value: '', disabled: true }, t('chooseExisting')),
          ...visible.map(item => h('option', { key: item.workspaceId, value: item.workspaceId }, item.title))),
        h('p', { className: 'ggWbMuted' }, chosen ? t('usingWorkspace', { title: chosen.title }) : t('noWorkspace')),
        chosen && h('button', { type: 'button', className: 'ggWbBtn ggWbBtnPrimary ggWbStartHere', disabled, onClick: () => service.run(service.newSession(chosen.workspaceId)) }, t('startHere')))
    }

    function Chevron() {
      return h('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        h('path', { d: 'M9 6l6 6-6 6' }))
    }

    function createWorkbenchFrame({ locale, collapse }) {
      const t = locale.bind(NS)
      const subscribeLocale = listener => locale.subscribe(listener)
      const localeSnapshot = () => locale.getSnapshot()

      return function WorkbenchFrame({ service, entry, active, conversation }) {
        React.useLayoutEffect(ensureStyles)
        React.useSyncExternalStore(subscribeLocale, localeSnapshot, localeSnapshot)
        const collapsed = React.useSyncExternalStore(collapse.subscribe, collapse.getSnapshot, collapse.getSnapshot)
        const host = React.useSyncExternalStore(service.subscribe, service.getSnapshot, service.getSnapshot)
        // Which session the main view shows is a fact of the session list, not of
        // the workbench state, so the frame follows that store as well.
        const sessions = service.ctx?.sessions?.list
        const subscribeSessions = React.useCallback(listener => sessions?.subscribe?.(listener) ?? (() => {}), [sessions])
        const sessionsSnapshot = () => sessions?.getSnapshot?.()
        React.useSyncExternalStore(subscribeSessions, sessionsSnapshot, sessionsSnapshot)
        const bodyId = React.useId()

        // The rule Desktop applies before it reveals `conversation`: the session in
        // the main view belongs to this workbench. Otherwise the node arrives hidden
        // and the frame has to offer a way to start a session.
        const current = service.currentSession?.()
        const owned = current != null && host?.state?.sessionBindings?.[current] === entry.id
        const toggleLabel = t(collapsed ? 'expandPanel' : 'collapsePanel')
        const failed = t('panelFailed')

        return h('div', { className: 'ggWb' }, h('div', { className: 'ggWbLayout' },
          // `conversation` stays the first child of the same element in every state:
          // moving it would remount the native composer and drop an unsent draft.
          h('div', { className: 'ggWbMain' },
            conversation,
            active && !owned && h(Boundary, { message: failed }, h(StartSession, { service, entry, host, t }))),
          h('aside', { className: 'ggWbSide', 'data-collapsed': collapsed, 'aria-label': t('panelLabel', { title: entry.title }) },
            h('header', { className: 'ggWbSideHeader' },
              h('h2', { className: 'ggWbTitle', hidden: collapsed }, entry.title),
              h('button', { type: 'button', className: 'ggWbToggle', 'aria-expanded': !collapsed, 'aria-controls': bodyId, 'aria-label': toggleLabel, title: toggleLabel, onClick: () => collapse.set(!collapsed) }, h(Chevron))),
            // Hidden, not unmounted: expanding again shows the status already loaded.
            h('div', { id: bodyId, className: 'ggWbSideBody', hidden: collapsed },
              h(Boundary, { message: failed }, h(StatusPanel, { t }))))))
      }
    }

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }))
      const WorkbenchFrame = createWorkbenchFrame({ locale: ctx.locale, collapse: createCollapseStore(() => window.localStorage) })
      ctx.effect(() => ctx.desktopWorkbenches.register({
        title: 'GenGrowth SEO/GEO',
        // The workbench identity Desktop derives is the lowercased owner/repository of this URL.
        repository: 'https://github.com/phananhson733-oss/gengrowth-workbench',
        description: 'SEO and GEO skills, prompt templates and site tools from GenGrowth.',
        customFrame: true,
      }, WorkbenchFrame))
    }

    return { apply, inject: ['desktopWorkbenches', 'locale'], createWorkbenchFrame, createCollapseStore }
  },
})
