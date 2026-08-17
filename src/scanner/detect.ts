// 网申系统检测:按 host 与 DOM 特征判断当前页面属于哪个 ATS

import type { SystemId } from '../shared/messages'

export function detectSystem(doc: Document = document): SystemId {
  const host = location.hostname
  if (/(^|\.)mokahr\.com$/.test(host)) return 'moka'
  if (/italent\.cn$|beisen\.com$/.test(host)) return 'beisen'

  // 部分租户用自定义域名,靠 DOM 指纹兜底
  if (doc.querySelector('[class*="moka"], [id*="moka"], .moka-app')) return 'moka'
  if (doc.querySelector('[class*="italent"], [class*="beisen"], #italent')) return 'beisen'
  return 'generic'
}
