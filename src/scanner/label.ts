// 标签提取:为表单控件找到其字段名称

/** id 转义进属性选择器(部分环境无 CSS.escape) */
function cssEscapeId(id: string): string {
  return typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(id) : id.replace(/["\\]/g, '\\$&')
}

/** 取 label 元素中的文本,剔除内嵌控件自身的值 */
function stripControlText(label: Element, control: Element): string {
  const clone = label.cloneNode(true) as Element
  // 移除内嵌的控件元素,避免把已填值/占位符当标签
  clone.querySelectorAll('input, textarea, select').forEach((el) => {
    if (el !== control || !control.contains(el)) el.remove()
  })
  return (clone.textContent ?? '').trim()
}

/** 向上/向前寻找文本元素(跳过纯图标与空节点) */
function findTextSibling(start: Element | null): string {
  let sib = start
  let depth = 0
  while (sib && depth < 3) {
    const t = (sib.textContent ?? '').trim()
    if (t) return t
    sib = sib.previousElementSibling
    depth++
  }
  return ''
}

export function findLabel(el: HTMLElement, doc: Document = document): string {
  // 1) label[for=id]
  const id = el.id
  if (id) {
    const lab = doc.querySelector(`label[for="${cssEscapeId(id)}"]`)
    if (lab?.textContent?.trim()) return lab.textContent.trim()
  }
  // 2) 祖先 label
  const closestLab = el.closest('label')
  if (closestLab) {
    const t = stripControlText(closestLab, el)
    if (t) return t
  }
  // 3) 前一个兄弟元素
  const sibText = findTextSibling(el.previousElementSibling)
  if (sibText) return sibText
  // 4) 父级的前兄弟(两列布局:label 与 control 分列)
  if (el.parentElement) {
    const parentText = findTextSibling(el.parentElement.previousElementSibling)
    if (parentText) return parentText
  }
  // 5) 表格行首格
  const row = el.closest('tr')
  if (row) {
    const first = row.querySelector('th, td')
    if (first?.textContent?.trim()) return first.textContent.trim()
  }
  // 6) 兜底属性
  return (
    el.getAttribute('aria-label') ||
    (el as HTMLInputElement).placeholder ||
    el.getAttribute('title') ||
    ''
  )
}

/** 控件是否基本可见(jsdom 无布局信息,仅做样式级判断) */
export function isVisible(el: HTMLElement): boolean {
  if (el.getAttribute('hidden') !== null) return false
  if (el.getAttribute('aria-hidden') === 'true') return false
  if (el instanceof HTMLInputElement && el.type === 'hidden') return false
  const style = window.getComputedStyle(el)
  if (style.display === 'none' || style.visibility === 'hidden') return false
  return true
}
