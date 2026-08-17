// 确定性填写引擎:把档案值写入 DOM 控件
// 关键点:原生 setter + input/change 事件(防 React 覆写)、选项文本匹配、下拉轮询等待

import type { FillOutcome, FillResult, ScannedField } from '../shared/messages'
import { matchOption } from '../core/matcher'
import { getByPath, type Attachment, type Profile } from '../core/profile'
import { dataUrlToFile } from '../core/file-utils'
import { collectFieldsWithAnchors } from '../scanner/scan'

export interface FillInstruction {
  fieldId: string
  path: string
}

const OPTION_SELECTORS = [
  '.ant-select-item-option',
  '.el-select-dropdown__item',
  '[role="option"]',
  '.select2-results__option',
  '.ivu-select-item',
  '.semi-select-option',
  '.n-base-select-option',
  'li[class*="option"]',
  'li[class*="item"]',
].join(', ')

export async function executeFill(
  instructions: FillInstruction[],
  profile: Profile,
  doc: Document = document,
): Promise<FillResult> {
  const anchored = collectFieldsWithAnchors(doc)
  const byId = new Map(anchored.map((a) => [a.field.fieldId, a]))
  const outcomes: FillOutcome[] = []

  for (const ins of instructions) {
    const entry = byId.get(ins.fieldId)
    if (!entry) {
      outcomes.push({ fieldId: ins.fieldId, label: ins.fieldId, status: 'failed', message: '页面上找不到该字段(可能已翻页)' })
      continue
    }
    outcomes.push(await fillOne(entry.field, entry.anchor, ins.path, profile, doc))
  }
  return { outcomes }
}

async function fillOne(
  field: ScannedField,
  anchor: Element,
  path: string,
  profile: Profile,
  doc: Document,
): Promise<FillOutcome> {
  const value = getByPath(profile, path)
  const base = { fieldId: field.fieldId, label: field.label }

  // 附件类(证件照/简历等)
  if (value && typeof value === 'object' && 'dataUrl' in (value as object)) {
    const ok = fillFile(anchor as HTMLInputElement, value as Attachment)
    return { ...base, status: ok ? 'filled' : 'failed', message: ok ? undefined : '文件写入失败' }
  }

  if (value === undefined || value === null || value === '') {
    return { ...base, status: 'skipped', message: '档案中该字段为空' }
  }

  // 数组值(如技能列表勾选多个 checkbox)
  if (Array.isArray(value)) {
    const values = value.map(String).filter(Boolean)
    if (!values.length) return { ...base, status: 'skipped', message: '档案中该字段为空' }
    if (field.kind === 'checkbox') return fillCheckboxes(anchor, values, doc, base)
    return { ...base, status: 'skipped', message: '该字段不支持数组值' }
  }

  const text = String(value)
  switch (field.kind) {
    case 'text':
      return fillText(anchor as HTMLElement, text, base)
    case 'select':
      return fillSelect(anchor as HTMLSelectElement, text, base)
    case 'radio':
      return fillRadio(anchor as HTMLInputElement, text, doc, base)
    case 'checkbox':
      return fillCheckboxSingle(anchor as HTMLInputElement, text, base)
    case 'date':
      return fillDate(anchor as HTMLInputElement, text, base)
    case 'dropdown':
      return fillDropdown(anchor as HTMLElement, text, doc, base)
    case 'file':
    case 'richtext':
      return { ...base, status: 'skipped', message: '该控件需手动处理' }
    default:
      return { ...base, status: 'skipped', message: `未知控件类型 ${field.kind}` }
  }
}

/* ---------- 文本 ---------- */

/** 原生 value setter + 事件派发,兼容 React/Vue 受控组件 */
function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const proto =
    el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  if (setter && setter !== Object.getOwnPropertyDescriptor(el, 'value')?.set) {
    setter.call(el, value)
  } else {
    el.value = value
  }
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

function fillText(el: HTMLElement, text: string, base: Omit<FillOutcome, 'status' | 'message'>): FillOutcome {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    setNativeValue(el, text)
    return { ...base, status: 'filled' }
  }
  // contenteditable
  el.focus()
  el.textContent = text
  el.dispatchEvent(new Event('input', { bubbles: true }))
  return { ...base, status: 'filled' }
}

/* ---------- 原生 select ---------- */

function fillSelect(
  el: HTMLSelectElement,
  text: string,
  base: Omit<FillOutcome, 'status' | 'message'>,
): FillOutcome {
  const optionTexts = [...el.options].map((o) => (o.textContent ?? '').trim())
  const target = matchOption(text, optionTexts)
  if (!target) {
    return { ...base, status: 'failed', message: `选项中找不到「${text}」(${optionTexts.slice(0, 6).join('/')}${optionTexts.length > 6 ? '…' : ''})` }
  }
  const idx = optionTexts.indexOf(target)
  el.value = el.options[idx].value
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
  return { ...base, status: 'filled' }
}

/* ---------- radio / checkbox ---------- */

/** 取 radio/checkbox 组:同名 input(扫描锚点为组内第一个) */
function peerInputs(anchor: HTMLInputElement, doc: Document): HTMLInputElement[] {
  if (!anchor.name) return [anchor]
  return [...doc.querySelectorAll(`input[type="${anchor.type}"][name="${anchor.name}"]`)] as HTMLInputElement[]
}

function inputOptionLabel(input: HTMLInputElement): string {
  const closest = input.closest('label')
  if (closest) {
    const clone = closest.cloneNode(true) as Element
    clone.querySelectorAll('input').forEach((i) => i.remove())
    const t = (clone.textContent ?? '').trim()
    if (t) return t
  }
  return input.parentElement?.textContent?.trim() || input.value
}

function fillRadio(
  anchor: HTMLInputElement,
  text: string,
  doc: Document,
  base: Omit<FillOutcome, 'status' | 'message'>,
): FillOutcome {
  const peers = peerInputs(anchor, doc)
  const labels = peers.map(inputOptionLabel)
  const target = matchOption(text, labels)
  if (!target) {
    return { ...base, status: 'failed', message: `选项中找不到「${text}」(${labels.join('/')})` }
  }
  peers[labels.indexOf(target)].click()
  return { ...base, status: 'filled' }
}

function fillCheckboxSingle(
  anchor: HTMLInputElement,
  text: string,
  base: Omit<FillOutcome, 'status' | 'message'>,
): FillOutcome {
  const labels = peerInputs(anchor, anchor.ownerDocument).map(inputOptionLabel)
  const target = matchOption(text, labels)
  if (!target) {
    return { ...base, status: 'failed', message: `选项中找不到「${text}」` }
  }
  const el = peerInputs(anchor, anchor.ownerDocument)[labels.indexOf(target)]
  if (!el.checked) el.click()
  return { ...base, status: 'filled' }
}

function fillCheckboxes(
  anchor: HTMLInputElement,
  values: string[],
  doc: Document,
  base: Omit<FillOutcome, 'status' | 'message'>,
): FillOutcome {
  const peers = peerInputs(anchor, doc)
  const labels = peers.map(inputOptionLabel)
  const missed: string[] = []
  for (const v of values) {
    const target = matchOption(v, labels)
    if (!target) {
      missed.push(v)
      continue
    }
    const el = peers[labels.indexOf(target)]
    if (!el.checked) el.click()
  }
  if (missed.length === values.length) {
    return { ...base, status: 'failed', message: `选项均不匹配:${missed.join('/')}` }
  }
  return { ...base, status: 'filled', message: missed.length ? `部分未匹配:${missed.join('/')}` : undefined }
}

/* ---------- 日期 ---------- */

function fillDate(
  el: HTMLInputElement,
  text: string,
  base: Omit<FillOutcome, 'status' | 'message'>,
): FillOutcome {
  let formatted = text
  if (el.type === 'month') formatted = text.slice(0, 7)
  if (el.type === 'date') formatted = text.length === 7 ? `${text}-01` : text.slice(0, 10)
  if (el.type === 'text') formatted = text // 自定义面板垫片,适配器处理
  if (el instanceof HTMLInputElement && ['date', 'month'].includes(el.type)) {
    setNativeValue(el, formatted)
    return { ...base, status: 'filled' }
  }
  // 垫片输入框:直接写文本并派发事件,弹层交给站点自身
  setNativeValue(el as HTMLInputElement, formatted)
  return { ...base, status: 'filled', message: '自定义日期面板,请人工核对' }
}

/* ---------- 自定义下拉 ---------- */

async function fillDropdown(
  wrapper: HTMLElement,
  text: string,
  doc: Document,
  base: Omit<FillOutcome, 'status' | 'message'>,
): Promise<FillOutcome> {
  // 已知选项时先本地匹配(部分站点把选项常驻 DOM)
  const existing = [...doc.querySelectorAll(OPTION_SELECTORS)] as HTMLElement[]
  let targetEl: HTMLElement | null = null
  if (existing.length) {
    const labels = existing.map((o) => (o.textContent ?? '').trim())
    const target = matchOption(text, labels)
    if (target) targetEl = existing[labels.indexOf(target)]
  }

  if (!targetEl) {
    // 打开下拉等待选项渲染
    dispatchMouse(wrapper)
    const options = await waitForOptions(doc, existing.length)
    if (!options.length) {
      return { ...base, status: 'failed', message: '未能打开下拉或未找到选项列表' }
    }
    const labels = options.map((o) => (o.textContent ?? '').trim())
    const target = matchOption(text, labels)
    if (!target) {
      return { ...base, status: 'failed', message: `选项中找不到「${text}」(${labels.slice(0, 6).join('/')}${labels.length > 6 ? '…' : ''})` }
    }
    targetEl = options[labels.indexOf(target)]
  }

  targetEl.click()
  return { ...base, status: 'filled' }
}

function dispatchMouse(el: HTMLElement): void {
  for (const type of ['mousedown', 'mouseup', 'click']) {
    el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }))
  }
}

async function waitForOptions(doc: Document, existingCount: number, timeoutMs = 2000): Promise<HTMLElement[]> {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    await sleep(120)
    const options = [...doc.querySelectorAll(OPTION_SELECTORS)] as HTMLElement[]
    if (options.length > existingCount) return options
  }
  return []
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/* ---------- 文件 ---------- */

function fillFile(input: HTMLInputElement, att: Attachment): boolean {
  try {
    const file = dataUrlToFile(att.dataUrl, att.name)
    const dt = new DataTransfer()
    dt.items.add(file)
    input.files = dt.files
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
    return input.files?.length === 1
  } catch {
    return false
  }
}
