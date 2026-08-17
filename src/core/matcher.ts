// 字段匹配器:页面字段标签 -> 档案字段路径
// 策略:手动映射(override)优先 -> 同义词精确 -> 标签含词 -> 词含标签(带歧义检测)

import {
  FIELD_RULES,
  FieldRule,
  ITEM_FIELD_RULES,
  OPTION_ALIASES,
  REPEATER_RULES,
} from './synonyms'
import type { ScannedField } from '../shared/messages'

/** 标签归一:全角转半角、小写、去空白/星号、去冒号与括号说明 */
export function normalizeLabel(label: string): string {
  return label
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s*]/g, '')
    .replace(/[:：,，(（].*$/, '')
    .trim()
}

export interface FieldMatch {
  path: string
  term: string
  exact: boolean
}

const AMBIGUOUS = Symbol('ambiguous')

function matchRules(label: string, rules: FieldRule[], prefix = ''): FieldMatch | null | typeof AMBIGUOUS {
  const norm = normalizeLabel(label)
  if (!norm) return null

  const cands: Array<{ path: string; term: string; tier: number }> = []
  for (const rule of rules) {
    for (const term of rule.terms) {
      const t = normalizeLabel(term)
      if (!t) continue
      if (t === norm) cands.push({ path: prefix + rule.path, term, tier: 0 })
      else if (norm.includes(t)) cands.push({ path: prefix + rule.path, term, tier: 1 })
      else if (t.includes(norm) && norm.length >= 2) cands.push({ path: prefix + rule.path, term, tier: 2 })
    }
  }
  if (cands.length === 0) return null

  const minTier = Math.min(...cands.map((c) => c.tier))
  const top = cands.filter((c) => c.tier === minTier)
  // 同层多 term 时取最长者(更具体);若最长者仍指向多个路径则视为歧义
  const maxLen = Math.max(...top.map((c) => normalizeLabel(c.term).length))
  const finalists = top.filter((c) => normalizeLabel(c.term).length === maxLen)
  const paths = new Set(finalists.map((f) => f.path))
  if (paths.size > 1) return AMBIGUOUS
  return { path: finalists[0].path, term: finalists[0].term, exact: finalists[0].tier === 0 }
}

export interface MappingResult {
  fieldId: string
  label: string
  path: string | null
  source: 'override' | 'rule' | 'ambiguous' | 'none'
}

/**
 * 为扫描出的字段构建映射。
 * @param overrides 当前页面结构签名下的手动映射 {fieldId -> 档案路径,''/ignore 表示跳过}
 */
export function buildMappings(
  fields: ScannedField[],
  overrides: Record<string, string> = {},
): MappingResult[] {
  return fields.map((field) => {
    const override = overrides[field.fieldId]
    if (override !== undefined) {
      return { fieldId: field.fieldId, label: field.label, path: override || null, source: 'override' }
    }

    let match: FieldMatch | null | typeof AMBIGUOUS = null
    if (field.repeaterId && field.repeaterId in ITEM_FIELD_RULES && field.rowIndex !== undefined) {
      match = matchRules(field.label, ITEM_FIELD_RULES[field.repeaterId], `${field.repeaterId}.${field.rowIndex}.`)
    } else if (!field.repeaterId) {
      match = matchRules(field.label, FIELD_RULES)
    }

    if (match === AMBIGUOUS) {
      return { fieldId: field.fieldId, label: field.label, path: null, source: 'ambiguous' }
    }
    if (!match) {
      return { fieldId: field.fieldId, label: field.label, path: null, source: 'none' }
    }
    return { fieldId: field.fieldId, label: field.label, path: match.path, source: 'rule' }
  })
}

/**
 * 选项匹配:档案值 -> 页面选项文案。
 * 优先精确/别名表,再双向包含(如 硕士 <-> 硕士研究生),无命中返回 null。
 */
export function matchOption(value: string, options: string[]): string | null {
  if (!value) return null
  const norm = (s: string) => s.normalize('NFKC').replace(/\s/g, '').toLowerCase()
  const v = norm(value)

  // 别名表精确
  for (const alias of OPTION_ALIASES[value] ?? []) {
    const hit = options.find((o) => norm(o) === norm(alias))
    if (hit) return hit
  }
  // 原值精确
  const exact = options.find((o) => norm(o) === v)
  if (exact) return exact
  // 别名包含
  for (const alias of OPTION_ALIASES[value] ?? []) {
    const hit = options.find((o) => norm(o).includes(norm(alias)))
    if (hit) return hit
  }
  // 双向包含
  const contains = options.find((o) => {
    const n = norm(o)
    return n.includes(v) || v.includes(n)
  })
  if (contains) return contains
  return null
}

/** 重复区块标题 -> 档案数组名(educations/works/...),未识别或歧义返回 null */
export function matchRepeaterTitle(title: string): string | null {
  const match = matchRules(title, REPEATER_RULES)
  if (!match || match === AMBIGUOUS) return null
  return match.path
}
