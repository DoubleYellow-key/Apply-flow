// DOM 扫描器:把网申页面表单提取为字段清单(字段顺序即文档序,fieldId 以此稳定)

import type { FieldKind, ScanResult, ScannedField } from '../shared/messages'
import { matchRepeaterTitle } from '../core/matcher'
import { computeSignature } from '../core/signature'
import { detectSystem } from './detect'
import { findLabel, findTextSibling, isVisible } from './label'

const CONTROL_SELECTOR = 'input, textarea, select, [contenteditable="true"], [role="combobox"]'
const SKIP_INPUT_TYPES = new Set(['submit', 'button', 'reset', 'image', 'hidden'])
const ADD_TEXT_RE = /(添加|新增|继续添加|再加)/
const ROW_CLASS_RE = /item|entry|row|group|card|block|repeat|section-item|list-/i

/** 常见组件库的下拉容器 */
const DROPDOWN_SELECTORS = [
  '[role="combobox"]',
  '.ant-select',
  '.el-select',
  '.el-select__wrapper',
  '.ivu-select',
  '.n-base-selection',
  '.arco-select-view',
  '.semi-select',
  '.select2-container',
].join(', ')

interface FieldDraft {
  anchor: Element
  label: string
  kind: FieldKind
  options?: string[]
  required?: boolean
}

interface RepeaterInfo {
  id: string
  rows: Element[]
  addBtn: Element
}

/** 扫描并保留 DOM 锚点(filler 复用同一遍历逻辑定位元素) */
export function collectFieldsWithAnchors(
  doc: Document = document,
): Array<{ field: ScannedField; anchor: Element }> {
  const repeaters = detectRepeaters(doc)
  const drafts: FieldDraft[] = []
  const consumed = new Set<Element>() // 已被下拉容器/radio 组吞并的原始控件

  // 阶段1:自定义下拉容器(取最外层,内嵌控件跳过)
  const wrappers = [...doc.querySelectorAll(DROPDOWN_SELECTORS)] as HTMLElement[]
  const outermost = wrappers.filter((w) => !wrappers.some((other) => other !== w && other.contains(w)))
  for (const w of outermost) {
    if (!isVisible(w)) continue
    const label = findLabel(w, doc)
    drafts.push({
      anchor: w,
      label: cleanLabel(label),
      kind: 'dropdown',
      required: isRequired(w, label),
    })
    w.querySelectorAll(CONTROL_SELECTOR).forEach((c) => consumed.add(c))
  }

  // 阶段2:radio / checkbox 分组
  const grouped = new Set<Element>()
  for (const type of ['radio', 'checkbox'] as const) {
    const inputs = [...doc.querySelectorAll(`input[type="${type}"]`)] as HTMLInputElement[]
    for (const input of inputs) {
      if (grouped.has(input) || consumed.has(input) || !isVisible(input)) continue
      const peers = inputs.filter(
        (o) => o !== input && o.name && o.name === input.name && !grouped.has(o) && !consumed.has(o),
      )
      const group = [input, ...peers]
      group.forEach((g) => grouped.add(g))
      const anchor = group[0]
      const label = groupLabel(anchor)
      drafts.push({
        anchor,
        label: cleanLabel(label),
        kind: type,
        options: group.map((g) => inputOptionText(g)),
        required: isRequired(anchor, label),
      })
    }
  }

  // 阶段3:普通控件
  const controls = [...doc.querySelectorAll(CONTROL_SELECTOR)] as HTMLElement[]
  for (const el of controls) {
    if (consumed.has(el) || grouped.has(el) || !isVisible(el)) continue
    if (el instanceof HTMLInputElement && (el.disabled || SKIP_INPUT_TYPES.has(el.type))) continue

    const label = findLabel(el, doc)
    drafts.push({
      anchor: el,
      label: cleanLabel(label),
      kind: classify(el),
      required: isRequired(el, label),
      options:
        el instanceof HTMLSelectElement
          ? [...el.options].map((o) => (o.textContent ?? '').trim()).filter(Boolean)
          : undefined,
    })
  }

  // 按文档序排序并编号
  drafts.sort((a, b) => {
    const pos = a.anchor.compareDocumentPosition(b.anchor)
    return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : pos & Node.DOCUMENT_POSITION_PRECEDING ? 1 : 0
  })

  // 稳定 fieldId:同(区块+行+标签+类型)签名内按文档序计数
  const seen = new Map<string, number>()
  return drafts.map((d) => {
    const rep = findRepeaterContext(d.anchor, repeaters)
    const scope = rep ? `${rep.id}.${rep.rowIndex}` : 'top'
    const label = normalizeKey(d.label) || 'unlabeled'
    const sig = `${scope}.${label}.${d.kind}`
    const n = (seen.get(sig) ?? 0) + 1
    seen.set(sig, n)
    const field: ScannedField = {
      fieldId: `${sig}${n > 1 ? `-${n}` : ''}`,
      label: d.label,
      kind: d.kind,
      options: d.options,
      required: d.required,
      repeaterId: rep?.id,
      rowIndex: rep?.rowIndex,
    }
    return { field, anchor: d.anchor }
  })
}

/** 标签转 id 片段:去掉非中英文数字字符 */
function normalizeKey(s: string): string {
  return s
    .normalize('NFKC')
    .replace(/[^\u4e00-\u9fa5a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
}

/** 扫描页面,返回可序列化结果(经消息传回面板) */
export function scanDocument(doc: Document = document): ScanResult {
  const anchored = collectFieldsWithAnchors(doc)
  const fields = anchored.map((a) => a.field)
  return {
    system: detectSystem(doc),
    url: location.href,
    title: doc.title,
    fields,
    signature: computeSignature(fields),
  }
}

function classify(el: HTMLElement): FieldKind {
  if (el instanceof HTMLSelectElement) return 'select'
  if (el instanceof HTMLTextAreaElement) return 'text'
  if (el instanceof HTMLInputElement) {
    if (el.type === 'file') return 'file'
    if (['date', 'month', 'week', 'datetime-local'].includes(el.type)) return 'date'
    // 只读文本垫片(点击弹自定义日期面板)
    if (el.type === 'text' && el.readOnly && looksLikeDateShim(el)) return 'date'
    if (el.type === 'checkbox') return 'checkbox'
    if (el.type === 'radio') return 'radio'
    return 'text'
  }
  if (el.getAttribute('contenteditable') === 'true') return 'text'
  return 'text'
}

function isRequired(el: Element, label: string): boolean | undefined {
  if (el.hasAttribute('required')) return true
  if (el.getAttribute('aria-required') === 'true') return true
  if (label.includes('*')) return true
  return undefined
}

/** 存储用标签:去掉必填星号与首尾空白 */
function cleanLabel(label: string): string {
  return label.replace(/^[*\s]+/, '').replace(/[*\s]+$/, '').trim()
}

function inputOptionText(input: HTMLInputElement): string {
  const id = input.id
  if (id) {
    const lab = document.querySelector(`label[for="${id.replace(/["\\]/g, '\\$&')}"]`)
    if (lab?.textContent?.trim()) return lab.textContent.trim()
  }
  const closest = input.closest('label')
  if (closest) {
    const clone = closest.cloneNode(true) as Element
    clone.querySelectorAll('input').forEach((i) => i.remove())
    const t = (clone.textContent ?? '').trim()
    if (t) return t
  }
  return input.parentElement?.textContent?.trim() || input.value
}

/** radio/checkbox 组标签:从选项外层 label 的兄弟找(跳过提示文本),再找 legend / 表格行首格 / aria */
function groupLabel(first: HTMLInputElement): string {
  // 选项常被 <label><input>男</label> 包裹,组标签在其外层 label 的兄弟里
  const wrap = first.closest('label') ?? first
  const sibText = findTextSibling(wrap.previousElementSibling as Element | null)
  if (sibText) return sibText
  // 父级的前兄弟(组容器与标签分列的布局)
  if (wrap.parentElement) {
    const parentText = findTextSibling(wrap.parentElement.previousElementSibling as Element | null, 2)
    if (parentText) return parentText
  }
  const legend = first.closest('fieldset')?.querySelector('legend')
  if (legend?.textContent?.trim()) return legend.textContent.trim()
  const row = first.closest('tr')
  if (row) {
    const cell = row.querySelector('th, td')
    if (cell?.textContent?.trim()) return cell.textContent.trim()
  }
  return first.getAttribute('aria-label') || first.name || ''
}

function looksLikeDateShim(el: HTMLInputElement): boolean {
  return /date|time|calendar|picker/i.test(el.className + ' ' + (el.getAttribute('onclick') ?? ''))
}

/** 检测重复区块:添加按钮 + 前方同类行容器 + 区块标题命中词典(未命中标题需 ≥2 行) */
export function detectRepeaters(doc: Document): RepeaterInfo[] {
  const result: RepeaterInfo[] = []
  const seenContainers = new Set<Element>()
  let unknownCount = 0

  const addBtns = [...doc.querySelectorAll('button, [role="button"], a, span, div, i')] as HTMLElement[]
  for (const btn of addBtns) {
    const text = (btn.textContent ?? '').trim()
    const classHint = /add|plus|append/i.test(btn.className ?? '')
    if (!(text.length <= 10 && ADD_TEXT_RE.test(text))) continue
    if (!(btn.matches('button, [role="button"], a') || classHint)) continue
    // 嵌套的容器文本会重复统计,取最内层候选
    if (btn.querySelector('button, [role="button"], a')) continue

    const container = btn.parentElement
    if (!container || seenContainers.has(container)) continue

    const rows = collectRowsBefore(btn)
    if (rows.length === 0) continue
    seenContainers.add(container)

    // 区块标题:容器的前兄弟短文本,或容器内首个非行子元素
    let title = ''
    let ps = container.previousElementSibling as Element | null
    for (let d = 0; d < 3 && ps; d++) {
      const t = (ps.textContent ?? '').trim()
      if (t && t.length <= 15) {
        title = t
        break
      }
      ps = ps.previousElementSibling as Element | null
    }
    if (!title) {
      const firstNonRow = [...container.children].find(
        (s) => !rows.includes(s) && (s.textContent ?? '').trim().length <= 15,
      )
      title = (firstNonRow?.textContent ?? '').trim()
    }

    const known = matchRepeaterTitle(title)
    if (!known && rows.length < 2) continue // 单行且标题未命中:多半不是重复区块
    const id = known ?? `unknown-${++unknownCount}`
    result.push({ id, rows, addBtn: btn })
  }
  return result
}

/** 添加按钮前方同类行(含控件、共享 class 特征) */
function collectRowsBefore(addBtn: Element): Element[] {
  const container = addBtn.parentElement
  if (!container) return []
  const siblings = [...container.children]
  const btnIdx = siblings.indexOf(addBtn)
  const rows: Element[] = []
  for (let i = btnIdx - 1; i >= 0; i--) {
    const sib = siblings[i]
    if (!sib.querySelector(CONTROL_SELECTOR)) break
    const cls = sib.getAttribute('class') ?? ''
    if (rows.length === 0 || shareClassToken(sib, rows[rows.length - 1]) || ROW_CLASS_RE.test(cls)) {
      rows.unshift(sib)
    } else break
  }
  return rows
}

/** 点击添加按钮并等待新行出现,返回新行(超时返回 null) */
export async function addRepeaterRow(rep: RepeaterInfo, timeoutMs = 2500): Promise<Element | null> {
  const container = rep.addBtn.parentElement
  if (!container) return null
  const beforeRows = collectRowsBefore(rep.addBtn).length
  const beforeControls = container.querySelectorAll(CONTROL_SELECTOR).length

  const btn = rep.addBtn as HTMLElement
  btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
  btn.click()

  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    await new Promise((r) => setTimeout(r, 150))
    const controls = container.querySelectorAll(CONTROL_SELECTOR).length
    if (controls <= beforeControls) continue
    const rows = collectRowsBefore(rep.addBtn)
    if (rows.length > beforeRows) return rows[rows.length - 1]
  }
  return null
}

function shareClassToken(a: Element, b: Element): boolean {
  const ca = (a.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)
  const cb = (b.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)
  return ca.some((c) => cb.includes(c) && c.length > 2)
}

function findRepeaterContext(
  anchor: Element,
  repeaters: RepeaterInfo[],
): { id: string; rowIndex: number } | undefined {
  for (const rep of repeaters) {
    const idx = rep.rows.findIndex((row) => row.contains(anchor))
    if (idx >= 0) return { id: rep.id, rowIndex: idx }
  }
  return undefined
}
