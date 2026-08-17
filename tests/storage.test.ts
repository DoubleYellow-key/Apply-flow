import { describe, expect, it } from 'vitest'
import { MemoryStorage } from '../src/core/storage'

describe('MemoryStorage', () => {
  it('set 后能 get 到相同值', async () => {
    const s = new MemoryStorage()
    await s.set('profile', { name: '黄信凯' })
    expect(await s.get('profile')).toEqual({ name: '黄信凯' })
  })

  it('未设置的键返回 undefined', async () => {
    const s = new MemoryStorage()
    expect(await s.get('nope')).toBeUndefined()
  })

  it('remove 后再 get 为 undefined', async () => {
    const s = new MemoryStorage()
    await s.set('a', 1)
    await s.remove('a')
    expect(await s.get('a')).toBeUndefined()
  })
})
