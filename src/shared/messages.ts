// 面板 / 内容脚本 / 后台之间的消息协议
// 约定:面板 -> 内容脚本用 chrome.tabs.sendMessage;内容脚本 -> 面板用 chrome.runtime.sendMessage

export const MSG = {
  /** 面板 -> 内容脚本:探测 content script 是否存活 */
  PING: 'PING',
  /** 面板 -> 内容脚本:扫描当前页面表单 */
  SCAN: 'SCAN',
  /** 面板 -> 内容脚本:按映射执行填充 */
  FILL: 'FILL',
  /** 面板 -> 后台:获取当前活动标签页 */
  GET_ACTIVE_TAB: 'GET_ACTIVE_TAB',
} as const

export interface FillRequest {
  type: typeof MSG.FILL
  instructions: Array<{ fieldId: string; path: string }>
}

/** 识别到的网申系统 */
export type SystemId = 'moka' | 'beisen' | 'generic'

/** 表单控件类型 */
export type FieldKind =
  | 'text' // input[text/password/tel/email/number] / textarea / contenteditable
  | 'select' // 原生 select
  | 'dropdown' // 自定义下拉(非原生)
  | 'radio'
  | 'checkbox'
  | 'date' // 日期/年月选择
  | 'file' // 文件上传
  | 'richtext' // 富文本编辑器

/** 扫描出的一个待填字段 */
export interface ScannedField {
  /** 页面内唯一标识(用于回填时定位 DOM) */
  fieldId: string
  /** 字段标签原文,如「姓名」「毕业院校」 */
  label: string
  kind: FieldKind
  /** select/dropdown/radio 的候选项文本 */
  options?: string[]
  /** 是否必填(带 * 标记) */
  required?: boolean
  /** 所属重复区块(教育经历/工作经历等),无则 undefined */
  repeaterId?: string
  /** 该字段在重复区块内的行序号(从 0 开始) */
  rowIndex?: number
}

/** 扫描结果 */
export interface ScanResult {
  system: SystemId
  url: string
  title: string
  fields: ScannedField[]
  /** 页面结构签名(用于手动映射记忆) */
  signature: string
}

/** 单个字段的填充结果 */
export interface FillOutcome {
  fieldId: string
  label: string
  status: 'filled' | 'failed' | 'skipped'
  message?: string
}

export interface FillResult {
  outcomes: FillOutcome[]
}
