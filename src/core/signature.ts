// 页面结构签名:字段指纹哈希,作为手动映射记忆(overrides)的 key
// 用标签+类型而非 URL,模板改版(字段未变)时映射仍有效

import type { ScannedField } from '../shared/messages'

export function computeSignature(fields: ScannedField[]): string {
  const parts = fields
    .map((f) => `${f.repeaterId ?? ''}#${f.label}#${f.kind}`)
    .sort()
    .join('|')
  // djb2 哈希
  let h = 5381
  for (let i = 0; i < parts.length; i++) {
    h = ((h << 5) + h + parts.charCodeAt(i)) | 0
  }
  return `sig_${(h >>> 0).toString(36)}`
}
