import { describe, expect, it } from 'vitest'
import { buildMappings, matchOption, matchRepeaterTitle, normalizeLabel } from '../src/core/matcher'
import { computeSignature } from '../src/core/signature'

describe('normalizeLabel', () => {
  it.each([
    ['姓名', '姓名'],
    ['* 姓名:', '姓名'],
    ['姓名(必填)', '姓名'],
    ['E-mail', 'e-mail'],
    ['手机号 :', '手机号'],
    ['  政治面貌 *', '政治面貌'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeLabel(input)).toBe(expected)
  })
})

describe('buildMappings', () => {
  it('顶层字段精确与包含匹配', () => {
    const fields = [
      { fieldId: 'f0', label: '姓名', kind: 'text' as const },
      { fieldId: 'f1', label: '* 电子邮箱:', kind: 'text' as const },
      { fieldId: 'f2', label: '您的联系电话', kind: 'text' as const },
    ]
    const mappings = buildMappings(fields)
    expect(mappings[0].path).toBe('basic.name')
    expect(mappings[0].source).toBe('rule')
    expect(mappings[1].path).toBe('basic.email')
    expect(mappings[2].path).toBe('basic.phone')
  })

  it('重复区块内字段映射到条目路径', () => {
    const fields = [
      { fieldId: 'f0', label: '毕业院校', kind: 'text' as const, repeaterId: 'educations', rowIndex: 0 },
      { fieldId: 'f1', label: '专业名称', kind: 'text' as const, repeaterId: 'educations', rowIndex: 1 },
    ]
    const mappings = buildMappings(fields)
    expect(mappings[0].path).toBe('educations.0.school')
    expect(mappings[1].path).toBe('educations.1.major')
  })

  it('家庭区块内的「姓名」映射到 family 而非 basic', () => {
    const fields = [
      { fieldId: 'f0', label: '姓名', kind: 'text' as const, repeaterId: 'family', rowIndex: 0 },
    ]
    expect(buildMappings(fields)[0].path).toBe('family.0.name')
  })

  it('歧义标签(仅「时间」)返回 ambiguous', () => {
    const fields = [
      { fieldId: 'f0', label: '时间', kind: 'text' as const, repeaterId: 'works', rowIndex: 0 },
    ]
    const m = buildMappings(fields)[0]
    expect(m.source).toBe('ambiguous')
    expect(m.path).toBeNull()
  })

  it('override 优先于规则', () => {
    const fields = [{ fieldId: 'f0', label: '联系人', kind: 'text' as const }]
    const mappings = buildMappings(fields, { f0: 'basic.name' })
    expect(mappings[0].path).toBe('basic.name')
    expect(mappings[0].source).toBe('override')
    // 空串 override = 用户标记跳过
    expect(buildMappings(fields, { f0: '' })[0].path).toBeNull()
    expect(buildMappings(fields, { f0: '' })[0].source).toBe('override')
  })

  it('未识别区块(repeaterId 未知)不做规则匹配', () => {
    const fields = [
      { fieldId: 'f0', label: '姓名', kind: 'text' as const, repeaterId: 'unknown-1', rowIndex: 0 },
    ]
    expect(buildMappings(fields)[0].source).toBe('none')
  })
})

describe('matchOption', () => {
  it('精确与别名', () => {
    expect(matchOption('男', ['男性', '女性'])).toBe('男性')
    expect(matchOption('中共党员', ['中共党员', '共青团员', '群众'])).toBe('中共党员')
    expect(matchOption('硕士研究生', ['博士研究生', '硕士研究生', '本科'])).toBe('硕士研究生')
  })

  it('双向包含(硕士 <-> 硕士研究生)', () => {
    expect(matchOption('硕士', ['博士', '硕士研究生', '本科'])).toBe('硕士研究生')
    expect(matchOption('硕士研究生', ['博士', '硕士', '本科'])).toBe('硕士')
  })

  it('无命中返回 null', () => {
    expect(matchOption('博士', ['本科', '硕士'])).toBeNull()
    expect(matchOption('', ['本科'])).toBeNull()
  })
})

describe('matchRepeaterTitle', () => {
  it('识别常见区块标题', () => {
    expect(matchRepeaterTitle('教育经历')).toBe('educations')
    expect(matchRepeaterTitle('教育背景')).toBe('educations')
    expect(matchRepeaterTitle('实习经历')).toBe('works')
    expect(matchRepeaterTitle('项目经历')).toBe('projects')
    expect(matchRepeaterTitle('家庭成员')).toBe('family')
    expect(matchRepeaterTitle('获奖情况')).toBe('awards')
  })

  it('未识别返回 null', () => {
    expect(matchRepeaterTitle('其他信息')).toBeNull()
    expect(matchRepeaterTitle('家庭成员')).toBe('family')
  })
})

describe('computeSignature', () => {
  it('字段顺序无关,内容相关', () => {
    const a = [
      { fieldId: 'f0', label: '姓名', kind: 'text' as const },
      { fieldId: 'f1', label: '邮箱', kind: 'text' as const },
    ]
    const b = [
      { fieldId: 'x1', label: '邮箱', kind: 'text' as const },
      { fieldId: 'x0', label: '姓名', kind: 'text' as const },
    ]
    expect(computeSignature(a)).toBe(computeSignature(b))
    const c = [...a, { fieldId: 'f2', label: '手机', kind: 'text' as const }]
    expect(computeSignature(a)).not.toBe(computeSignature(c))
  })
})
