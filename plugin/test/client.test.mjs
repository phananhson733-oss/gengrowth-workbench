// The client entry is one script that DSH Desktop evaluates in its page. These
// tests evaluate the same file and render the frame it registers with real React,
// without a browser: the server renderer produces the markup, and a click is made
// by calling the handler React would call.
//
// What needs a real page is recorded in docs/verification.md: that collapsing
// keeps the native composer mounted, the stylesheet, and the narrow layout.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const code = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
const NS = 'gengrowth-workbench'
const COLLAPSED_KEY = 'gengrowth-workbench:panel-collapsed'
const ENTRY = { id: 'acme/workbench', title: 'Acme Workbench' }

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial))
  return { getItem: key => values.has(key) ? values.get(key) : null, setItem: (key, value) => { values.set(key, String(value)) } }
}

/** Evaluates the entry the way the page does and returns what its factory exports. */
function loadClient({ storage = memoryStorage() } = {}) {
  const seen = { elements: {}, clicks: {} }
  const spied = {
    ...React,
    createElement(type, props, ...children) {
      for (const name of typeof props?.className === 'string' ? props.className.split(' ') : []) {
        seen.elements[name] = { type, props, children }
        if (props.onClick) seen.clicks[name] = props.onClick
      }
      return React.createElement(type, props, ...children)
    },
  }
  let registered
  const window = { localStorage: storage, __ModuleLoader__: { load: (module) => { registered = module } } }
  // Rendering on the server runs no effects, so neither the stylesheet nor the
  // status request may be reached.
  const fetch = () => { throw new Error('the frame must not fetch while rendering') }
  new Function('window', 'document', 'fetch', code)(window, undefined, fetch)
  const exports = registered.factory((name) => {
    assert.equal(name, 'react', 'the client may only require what the shared baseline provides')
    return spied
  })
  return { id: registered.id, ...exports, seen }
}

/** Same contract as Harness's locale service: methods read `this`, `{name}` placeholders. */
class FakeLocale {
  constructor(active = 'zh') {
    this.snapshot = { active, revision: 0 }
    this.dicts = new Map()
    this.listeners = new Set()
  }
  getSnapshot() { return this.snapshot }
  subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener) }
  register(ns, dicts) { this.dicts.set(ns, dicts); return () => this.dicts.delete(ns) }
  bind(ns) {
    return (key, params) => {
      const template = this.dicts.get(ns)?.[this.snapshot.active]?.[key] ?? key
      return params ? template.replace(/\{(\w+)\}/g, (match, name) => name in params ? String(params[name]) : match) : template
    }
  }
}

/** A host store whose methods need their receiver, like the ones Desktop hands out. */
class HostStore {
  constructor(snapshot) { this.snapshot = snapshot; this.listeners = new Set() }
  getSnapshot() { return this.snapshot }
  subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener) }
}

function fakeService({ current = null, bindings = {}, workspaces = [], hidden = [], ready = true, pending = 0 } = {}) {
  const calls = []
  const snapshot = { state: { active: ENTRY.id, sessionBindings: bindings }, ready, pending }
  const visible = () => workspaces.filter(item => !hidden.includes(item.workspaceId))
  const service = {
    blocked: false,
    ctx: { sessions: { list: new HostStore({ byId: {} }) }, workspaces: { list: new HostStore({ items: workspaces }) } },
    subscribe: () => () => {},
    getSnapshot: () => snapshot,
    currentSession: () => current ?? undefined,
    workspaceVisible: workspaceId => !hidden.includes(workspaceId),
    defaultWorkspace: () => visible()[0],
    newSession: (workspaceId) => { calls.push(['newSession', workspaceId]); return 'pending new session' },
    newWorkspaceSession: () => { calls.push(['newWorkspaceSession']); return 'pending workspace session' },
    run: (promise) => { calls.push(['run', promise]) },
  }
  return { service, calls }
}

const conversation = React.createElement('div', { 'data-native-conversation': '' }, 'native conversation')

function setup({ storage = memoryStorage(), locale = new FakeLocale(), ...serviceOptions } = {}) {
  const client = loadClient({ storage })
  client.apply({ locale, effect: fn => fn(), desktopWorkbenches: { register: () => () => {} } })
  const Frame = client.createWorkbenchFrame({ locale, collapse: client.createCollapseStore(() => storage) })
  const { service, calls } = fakeService(serviceOptions)
  const render = (props = {}) => renderToStaticMarkup(React.createElement(Frame, { service, entry: ENTRY, active: true, conversation, ...props }))
  return { client, storage, service, calls, render, seen: client.seen }
}
const OWNED = { current: 's1', bindings: { s1: ENTRY.id } }
const WORKSPACES = [{ workspaceId: 'w1', title: 'Site A', sessionIds: [] }, { workspaceId: 'w2', title: 'Site B', sessionIds: [] }]

test('the entry registers a custom-frame workbench and both locales', () => {
  const storage = memoryStorage({ [COLLAPSED_KEY]: 'true' })
  const client = loadClient({ storage })
  const locale = new FakeLocale()
  const registered = []
  const disposers = []
  client.apply({
    locale,
    effect: (fn) => { disposers.push(fn()) },
    desktopWorkbenches: { register: (descriptor, Component) => { registered.push({ descriptor, Component }); return () => {} } },
  })

  assert.equal(client.id, 'gengrowth-workbench')
  assert.deepEqual(client.inject, ['desktopWorkbenches', 'locale'])
  assert.equal(registered.length, 1)
  assert.ok(disposers.every(dispose => typeof dispose === 'function'), 'every registration hands its disposer to ctx.effect')
  const { descriptor, Component } = registered[0]
  assert.equal(descriptor.customFrame, true)
  assert.equal(descriptor.title, 'GenGrowth SEO/GEO')
  // The identity Desktop derives from this URL owns the existing sessions.
  assert.equal(descriptor.repository, 'https://github.com/phananhson733-oss/gengrowth-workbench')

  const { zh, en } = locale.dicts.get(NS)
  assert.deepEqual(Object.keys(zh).sort(), Object.keys(en).sort())
  for (const dict of [zh, en]) assert.ok(Object.values(dict).every(value => typeof value === 'string' && value.length > 0))

  // The registered component reads the page's own localStorage.
  const { service } = fakeService(OWNED)
  renderToStaticMarkup(React.createElement(Component, { service, entry: ENTRY, active: true, conversation }))
  assert.equal(client.seen.elements.ggWbSide.props['data-collapsed'], true)
})

test('with a session of this workbench the frame docks the conversation beside an expanded panel', () => {
  const { render, seen } = setup(OWNED)
  const markup = render()

  assert.equal(seen.elements.ggWbMain.children[0], conversation)
  assert.ok(markup.includes('native conversation'))
  assert.equal(seen.elements.ggWbStart, undefined, 'no start actions over a visible conversation')
  const { ggWbSide, ggWbToggle, ggWbSideBody, ggWbTitle } = seen.elements
  assert.equal(ggWbSide.type, 'aside')
  assert.equal(ggWbSide.props['data-collapsed'], false)
  assert.equal(ggWbSide.props['aria-label'], 'Acme Workbench 面板')
  assert.equal(ggWbToggle.props['aria-expanded'], true)
  assert.equal(ggWbToggle.props['aria-label'], '收起面板')
  assert.equal(ggWbToggle.props['aria-controls'], ggWbSideBody.props.id)
  assert.equal(ggWbSideBody.props.hidden, false)
  assert.equal(ggWbTitle.props.hidden, false)
  assert.ok(markup.includes('正在读取…'), 'the status view is mounted in the panel')
})

test('the toggle collapses the panel, keeps the conversation in place and remembers the choice', () => {
  const { render, seen, storage } = setup(OWNED)
  render()
  seen.clicks.ggWbToggle()
  assert.equal(storage.getItem(COLLAPSED_KEY), 'true')

  const markup = render()
  const { ggWbMain, ggWbSide, ggWbToggle, ggWbSideBody, ggWbTitle } = seen.elements
  assert.equal(ggWbMain.children[0], conversation, 'the conversation keeps its slot, so React does not remount it')
  assert.ok(markup.includes('native conversation'))
  assert.equal(ggWbSide.props['data-collapsed'], true)
  assert.equal(ggWbToggle.props['aria-expanded'], false)
  assert.equal(ggWbToggle.props['aria-label'], '展开面板')
  assert.equal(ggWbSideBody.props.hidden, true)
  assert.equal(ggWbTitle.props.hidden, true)

  // A reload starts from storage alone.
  const reloaded = setup({ ...OWNED, storage })
  reloaded.render()
  assert.equal(reloaded.seen.elements.ggWbSide.props['data-collapsed'], true)
  reloaded.seen.clicks.ggWbToggle()
  assert.equal(storage.getItem(COLLAPSED_KEY), 'false')
  reloaded.render()
  assert.equal(reloaded.seen.elements.ggWbSide.props['data-collapsed'], false)
})

test('the collapse choice works for the page when storage is unavailable', () => {
  const { createCollapseStore } = loadClient()
  const broken = { getItem() { throw new Error('denied') }, setItem() { throw new Error('denied') } }
  for (const getStorage of [() => broken, () => undefined, () => { throw new Error('no storage') }]) {
    const store = createCollapseStore(getStorage)
    let notified = 0
    const unsubscribe = store.subscribe(() => { notified++ })
    assert.equal(store.getSnapshot(), false)
    store.set(true)
    assert.equal(store.getSnapshot(), true)
    assert.equal(notified, 1)
    unsubscribe()
    store.set(false)
    assert.equal(notified, 1)
  }
})

test('without a session of this workbench the frame offers the start actions of the default frame', () => {
  const { render, seen, calls } = setup({ workspaces: WORKSPACES, hidden: ['w1'] })
  const markup = render()

  assert.equal(seen.elements.ggWbMain.children[0], conversation, 'the hidden conversation node stays docked')
  assert.ok(markup.includes('开始使用 Acme Workbench'))
  assert.ok(markup.includes('Site B'))
  assert.ok(!markup.includes('Site A'), 'a workspace removed from this workbench is not offered')
  assert.ok(markup.includes('将使用工作区：Site B'))
  assert.equal(seen.elements.ggWbStartHere.props.disabled, false)

  seen.clicks.ggWbStartHere()
  assert.deepEqual(calls, [['newSession', 'w2'], ['run', 'pending new session']])
  calls.length = 0
  seen.clicks.ggWbStartCreate()
  assert.deepEqual(calls, [['newWorkspaceSession'], ['run', 'pending workspace session']])
  // The panel is available before any session exists.
  assert.equal(seen.elements.ggWbSide.props['data-collapsed'], false)
})

test('with no workspace the only start action is creating one', () => {
  const { render, seen } = setup()
  const markup = render()
  assert.equal(seen.elements.ggWbStartHere, undefined)
  assert.ok(!markup.includes('<select'))
  assert.ok(seen.elements.ggWbStartCreate.props.className.includes('ggWbBtnPrimary'))
  assert.ok(markup.includes('选择或新建一个项目文件夹，即可创建工作区并开始对话。'))
})

test('start actions wait while the host is loading or saving', () => {
  for (const options of [{ ready: false }, { pending: 1 }]) {
    const { render, seen } = setup({ workspaces: WORKSPACES, ...options })
    render()
    assert.equal(seen.elements.ggWbStartCreate.props.disabled, true)
    assert.equal(seen.elements.ggWbStartHere.props.disabled, true)
  }
})

test('a session of another workbench or an ordinary session does not count as owned', () => {
  for (const bindings of [{ s1: 'other/workbench' }, {}]) {
    const { render, seen } = setup({ current: 's1', bindings })
    render()
    assert.ok(seen.elements.ggWbStart, JSON.stringify(bindings))
  }
})

test('a frame that is not in front renders no start actions', () => {
  const { render, seen } = setup({ workspaces: WORKSPACES })
  const markup = render({ active: false, conversation: null })
  assert.equal(seen.elements.ggWbStart, undefined)
  assert.equal(seen.elements.ggWbMain.children[0], null)
  assert.ok(markup.includes('ggWbSide'))
})

test('copy follows the host locale', () => {
  const { render, seen } = setup({ locale: new FakeLocale('en'), workspaces: WORKSPACES })
  const markup = render()
  assert.equal(seen.elements.ggWbToggle.props['aria-label'], 'Collapse panel')
  assert.ok(markup.includes('Get started with Acme Workbench'))
  assert.ok(markup.includes('New session in this workspace'))
})
