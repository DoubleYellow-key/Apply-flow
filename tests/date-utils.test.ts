import { describe, expect, it } from 'vitest'
import { normalizeDate, normalizeFullDate } from '../src/core/date-utils'

describe('normalizeDate', () => {
  it.each([
    ['2023.06', '2023-06'],
    ['2023.6', '2023-06'],
    ['2023-06', '2023-06'],
    ['2023/6', '2023-06'],
    ['2023年6月', '2023-06'],
    ['2023年06月', '2023-06'],
    ['2023年', '2023'],
    ['2023', '2023'],
    ['13月', '13月'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeDate(input)).toBe(expected)
  })
})

describe('normalizeFullDate', () => {
  it.each([
    ['2000年1月1日', '2000-01-01'],
    ['2000.1.1', '2000-01-01'],
    ['2000-1-1', '2000-01-01'],
    ['2000/01/01', '2000-01-01'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeFullDate(input)).toBe(expected)
  })
})
