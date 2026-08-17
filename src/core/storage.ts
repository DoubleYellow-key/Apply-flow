// chrome.storage.local 的轻量封装:类型化读写 + 测试环境下的内存实现

export interface StorageLike {
  get<T>(key: string): Promise<T | undefined>
  set<T>(key: string, value: T): Promise<void>
  remove(key: string): Promise<void>
}

class ChromeStorage implements StorageLike {
  async get<T>(key: string): Promise<T | undefined> {
    const items = await chrome.storage.local.get(key)
    return items[key] as T | undefined
  }

  async set<T>(key: string, value: T): Promise<void> {
    await chrome.storage.local.set({ [key]: value })
  }

  async remove(key: string): Promise<void> {
    await chrome.storage.local.remove(key)
  }
}

export class MemoryStorage implements StorageLike {
  private data = new Map<string, unknown>()

  async get<T>(key: string): Promise<T | undefined> {
    return this.data.get(key) as T | undefined
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.data.set(key, value)
  }

  async remove(key: string): Promise<void> {
    this.data.delete(key)
  }
}

const hasChromeStorage =
  typeof chrome !== 'undefined' && typeof chrome.storage?.local?.get === 'function'

export const storage: StorageLike = hasChromeStorage ? new ChromeStorage() : new MemoryStorage()

/** 存储键清单 */
export const STORAGE_KEYS = {
  /** 结构化档案 */
  profile: 'profile',
  /** 手动映射记忆:结构签名 -> {fieldId -> 档案路径} */
  overrides: 'overrides',
  /** 开放题答案库 */
  answers: 'answers',
  /** 杂项设置 */
  settings: 'settings',
} as const
