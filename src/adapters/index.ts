// 适配器注册表:系统检测按注册顺序匹配,首个命中生效
// 真机适配新系统时:新建 adapter 文件并加入 ADAPTERS

import type { SystemId } from '../shared/messages'
import { mokaAdapter } from './moka'
import { beisenAdapter } from './beisen'

export interface Adapter {
  id: SystemId
  detect(doc: Document): boolean
}

export const ADAPTERS: Adapter[] = [mokaAdapter, beisenAdapter]

export function detectSystemByAdapters(doc: Document): SystemId | null {
  for (const adapter of ADAPTERS) {
    if (adapter.detect(doc)) return adapter.id
  }
  return null
}
