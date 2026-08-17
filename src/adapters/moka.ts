// Moka (mokahr.com) 适配器
// 特性:React SPA、下拉选项 portal 渲染到 body、年月选择器、租户自定义字段、
// 教育经历等重复区块(通用引擎的 portal 选项搜索/增行/DataTransfer 上传已覆盖)。
// 真机使用中发现差异时在此补充选择器级规则。

import type { Adapter } from './index'

export const mokaAdapter: Adapter = {
  id: 'moka',
  detect(doc: Document): boolean {
    if (/(^|\.)mokahr\.com$/.test(location.hostname)) return true
    // 租户自定义域名时的 DOM 指纹
    if (doc.querySelector('[class*="moka"], [id*="moka"], .moka-app')) return true
    return false
  },
}
