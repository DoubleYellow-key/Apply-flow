// 日期归一化工具:各种简历写法 -> YYYY-MM

/**
 * 归一化日期字符串 -> YYYY-MM。
 * 支持:2023.06 / 2023.6 / 2023-06 / 2023/6 / 2023年6月 / 2023年06月
 * 仅年份(2023年)返回 YYYY;无法解析返回原文。
 */
export function normalizeDate(input: string): string {
  const s = input.trim().replace(/\s+/g, '')
  const m = s.match(/(\d{4})\s*[./年-]\s*(\d{1,2})\s*月?/)
  if (m) {
    const month = Number(m[2])
    if (month >= 1 && month <= 12) {
      return `${m[1]}-${String(month).padStart(2, '0')}`
    }
    return m[1]
  }
  const yearOnly = s.match(/^(\d{4})年?$/)
  if (yearOnly) return yearOnly[1]
  return s
}

/** 完整日期归一化 -> YYYY-MM-DD(出生日期等场景) */
export function normalizeFullDate(input: string): string {
  const s = input.trim()
  const m = s.match(/(\d{4})[./年-](\d{1,2})[./月-](\d{1,2})日?/)
  if (m) {
    const month = Number(m[2])
    const day = Number(m[3])
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${m[1]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
  }
  return s
}
