// 档案数据的清洗与合并:导入 JSON / 解析简历草稿时使用

import { createEmptyProfile, PROFILE_VERSION, type Attachment, type Profile } from './profile'
import type { ParsedDraft } from './draft-types'

/** 重复区块条目的已知字符串字段 */
const ITEM_FIELDS: Record<string, string[]> = {
  educations: ['school', 'college', 'major', 'degree', 'degreeType', 'startDate', 'endDate', 'rank', 'gpa', 'mode'],
  works: ['company', 'position', 'startDate', 'endDate', 'description'],
  projects: ['name', 'role', 'startDate', 'endDate', 'description'],
  awards: ['name', 'date'],
  family: ['relation', 'name', 'age', 'company', 'position', 'politicalStatus'],
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function asAttachment(v: unknown): Attachment | undefined {
  if (!isObj(v)) return undefined
  if (typeof v.name === 'string' && typeof v.mime === 'string' && typeof v.dataUrl === 'string') {
    return { name: v.name, mime: v.mime, dataUrl: v.dataUrl }
  }
  return undefined
}

/** 把 src 中的字符串字段拷到 dest(dest 已有的键限定范围) */
function copyStrings(src: unknown, dest: object): void {
  if (!isObj(src)) return
  const d = dest as Record<string, unknown>
  for (const key of Object.keys(d)) {
    if (typeof src[key] === 'string') d[key] = src[key]
  }
}

/**
 * 将任意来源对象清洗为合法 Profile:以空档案为底,仅拷贝已知字段。
 * 防止导入 JSON 缺字段或带脏数据导致引擎崩溃。
 */
export function sanitizeProfile(raw: unknown): Profile {
  const out = createEmptyProfile()
  if (!isObj(raw)) return out

  copyStrings(raw.basic, out.basic)
  if (isObj(raw.basic)) out.basic.photo = asAttachment(raw.basic.photo)

  const outRec = out as unknown as Record<string, unknown>
  for (const [key, fields] of Object.entries(ITEM_FIELDS)) {
    const arr = raw[key]
    if (!Array.isArray(arr)) continue
    outRec[key] = arr.filter(isObj).map((item) => {
      const entry: Record<string, string> = {}
      for (const f of fields) entry[f] = typeof item[f] === 'string' ? item[f] : ''
      return entry
    })
  }

  if (Array.isArray(raw.skills)) {
    out.skills = raw.skills.filter((s): s is string => typeof s === 'string')
  }
  copyStrings(raw.intention, out.intention)
  if (typeof raw.selfEvaluation === 'string') out.selfEvaluation = raw.selfEvaluation

  if (Array.isArray(raw.answers)) {
    out.answers = raw.answers.filter(isObj).map((a, i) => ({
      id: typeof a.id === 'string' ? a.id : `ans-${Date.now()}-${i}`,
      keywords: Array.isArray(a.keywords) ? a.keywords.filter((k): k is string => typeof k === 'string') : [],
      question: typeof a.question === 'string' ? a.question : '',
      answer: typeof a.answer === 'string' ? a.answer : '',
    }))
  }

  if (isObj(raw.attachments)) {
    for (const [k, v] of Object.entries(raw.attachments)) {
      const att = asAttachment(v)
      if (att) out.attachments[k] = att
    }
  }

  out.version = PROFILE_VERSION
  return out
}

/**
 * 将解析草稿合并进现有档案:解析出的非空值覆盖,空值保留原值。
 * 数组(教育/实习/项目/获奖/技能)若解析出内容则整体替换,避免新旧混杂。
 */
export function mergeDraft(profile: Profile, draft: ParsedDraft): Profile {
  const next = structuredClone(profile)

  for (const [key, value] of Object.entries(draft.basic)) {
    if (typeof value === 'string' && value.trim()) {
      ;(next.basic as unknown as Record<string, string>)[key] = value
    }
  }

  if (draft.educations.length) next.educations = draft.educations
  if (draft.works.length) next.works = draft.works
  if (draft.projects.length) next.projects = draft.projects
  if (draft.awards.length) next.awards = draft.awards
  if (draft.skills.length) next.skills = draft.skills
  if (draft.selfEvaluation.trim()) next.selfEvaluation = draft.selfEvaluation

  return next
}
