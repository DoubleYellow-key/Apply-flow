import { describe, expect, it } from 'vitest'
import { mergeDraft, sanitizeProfile } from '../src/core/profile-merge'
import { createEmptyProfile } from '../src/core/profile'

describe('sanitizeProfile', () => {
  it('空对象/垃圾输入返回空档案', () => {
    expect(sanitizeProfile(null).basic.name).toBe('')
    expect(sanitizeProfile('x').educations).toEqual([])
    expect(sanitizeProfile(undefined).version).toBe(1)
  })

  it('拷贝已知字段,丢弃脏数据', () => {
    const p = sanitizeProfile({
      basic: { name: '黄信凯', phone: 12345, evil: 'drop me' },
      educations: [{ school: '广州大学', major: '大数据技术与工程', hack: true }, 'garbage'],
      skills: ['Python', 42],
      attachments: { resume: { name: 'r.pdf', mime: 'application/pdf', dataUrl: 'data:...' } },
      unknownSection: { a: 1 },
    })
    expect(p.basic.name).toBe('黄信凯')
    expect(p.basic.phone).toBe('') // 非字符串被丢弃
    expect(p.educations).toEqual([
      { school: '广州大学', college: '', major: '大数据技术与工程', degree: '', degreeType: '', startDate: '', endDate: '', rank: '', gpa: '', mode: '' },
    ])
    expect(p.skills).toEqual(['Python'])
    expect(p.attachments.resume?.name).toBe('r.pdf')
  })

  it('合法档案 round-trip 不丢字段', () => {
    const p = createEmptyProfile()
    p.basic.name = '黄信凯'
    p.educations.push({ school: '广州大学', college: '', major: '大数据', degree: '硕士', degreeType: '硕士', startDate: '2022-09', endDate: '2025-06', rank: '', gpa: '', mode: '全日制' })
    const copy = sanitizeProfile(JSON.parse(JSON.stringify(p)))
    expect(copy).toEqual(p)
  })
})

describe('mergeDraft', () => {
  it('非空草稿值覆盖,空值保留原值,数组整体替换', () => {
    const p = createEmptyProfile()
    p.basic.name = '原名'
    p.basic.email = 'old@example.com'
    p.educations.push({
      school: '旧学校', college: '', major: '', degree: '', degreeType: '',
      startDate: '', endDate: '', rank: '', gpa: '', mode: '',
    })

    const merged = mergeDraft(p, {
      basic: { name: '', phone: '13800138000', email: '', idNumber: '' },
      educations: [],
      works: [],
      projects: [],
      awards: [],
      skills: ['Python'],
      selfEvaluation: '',
    })

    expect(merged.basic.name).toBe('原名') // 草稿为空 -> 保留
    expect(merged.basic.phone).toBe('13800138000')
    expect(merged.skills).toEqual(['Python'])
    // 教育草稿为空数组 -> 不替换,保留旧学校
    expect(merged.educations[0].school).toBe('旧学校')
  })
})
