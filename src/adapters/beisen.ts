// 北森 Beisen (italent) 适配器
// 特性:多页长表单(逐页扫描-填充-人工翻页)、政治面貌等重下拉、
// 教育/家庭动态表格(通用引擎的下拉匹配/增行已覆盖)。
// 注意:北森流程中的认知/性格测评不属于表单填写范畴,本插件不处理。

import type { Adapter } from './index'

export const beisenAdapter: Adapter = {
  id: 'beisen',
  detect(doc: Document): boolean {
    if (/italent\.cn$|beisen\.com$/.test(location.hostname)) return true
    if (doc.querySelector('[class*="italent"], [class*="beisen"], #italent')) return true
    return false
  },
}
