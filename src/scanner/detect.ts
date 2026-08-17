// 网申系统检测:适配器注册表优先,未命中走通用识别

import type { SystemId } from '../shared/messages'
import { detectSystemByAdapters } from '../adapters'

export function detectSystem(doc: Document = document): SystemId {
  return detectSystemByAdapters(doc) ?? 'generic'
}
