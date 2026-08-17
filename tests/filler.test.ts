import { beforeAll, describe, expect, it } from 'vitest'
import { executeFill } from '../src/filler/fill'
import { createEmptyProfile, type Profile } from '../src/core/profile'

const FIXTURE = `
<form id="app">
  <div class="row"><label for="name">姓名</label><input id="name" type="text"></div>
  <div class="row">
    <label>学历</label>
    <select id="degree">
      <option value="">请选择</option>
      <option value="1">大专</option>
      <option value="2">本科</option>
      <option value="3">硕士研究生</option>
    </select>
  </div>
  <div class="row">
    <label>性别</label>
    <label><input type="radio" name="gender" value="1">男</label>
    <label><input type="radio" name="gender" value="2">女</label>
  </div>
  <div class="row">
    <label>技能</label>
    <label><input type="checkbox" name="skill" value="a">Python</label>
    <label><input type="checkbox" name="skill" value="b">Go</label>
    <label><input type="checkbox" name="skill" value="c">Java</label>
  </div>
  <div class="row"><label>毕业时间</label><input type="month" id="grad"></div>
  <div class="row">
    <label>政治面貌</label>
    <div class="ant-select" id="pol-select"><div class="ant-select-selector"><span>请选择</span></div></div>
  </div>
  <div class="row"><label>自我评价</label><textarea id="eval"></textarea></div>
</form>
`

function makeProfile(): Profile {
  const p = createEmptyProfile()
  p.basic.name = '黄信凯'
  p.basic.gender = '男'
  p.basic.politicalStatus = '中共党员'
  p.educations.push({
    school: '广州大学', college: '', major: '大数据技术与工程', degree: '硕士', degreeType: '硕士',
    startDate: '2022-09', endDate: '2025-06', rank: '', gpa: '', mode: '全日制',
  })
  p.skills = ['Python', 'Go']
  p.selfEvaluation = '学习能力强'
  return p
}

/** 扫描拿到 fieldId(与 filler 同一遍历),再按 label 找 id */
async function fieldIdOf(label: string): Promise<string> {
  const { scanDocument } = await import('../src/scanner/scan')
  const result = scanDocument()
  return result.fields.find((f) => f.label === label)!.fieldId
}

describe('executeFill', () => {
  let profile: Profile
  const events: string[] = []

  beforeAll(() => {
    document.body.innerHTML = FIXTURE
    profile = makeProfile()
    // 记录 name 输入框的事件(验证事件派发)
    document.getElementById('name')!.addEventListener('input', () => events.push('input'))
    document.getElementById('name')!.addEventListener('change', () => events.push('change'))
    // 模拟 antd 下拉:点击后渲染选项
    document.getElementById('pol-select')!.addEventListener('click', () => {
      const ul = document.createElement('div')
      ul.innerHTML = `<div class="ant-select-item-option">中共党员</div>
        <div class="ant-select-item-option">共青团员</div><div class="ant-select-item-option">群众</div>`
      document.body.appendChild(ul)
    })
  })

  it('文本输入:写值并派发 input/change 事件', async () => {
    const id = await fieldIdOf('姓名')
    const { outcomes } = await executeFill([{ fieldId: id, path: 'basic.name' }], profile)
    expect(outcomes[0].status).toBe('filled')
    expect((document.getElementById('name') as HTMLInputElement).value).toBe('黄信凯')
    expect(events).toEqual(['input', 'change'])
  })

  it('select:硕士 匹配到 硕士研究生 选项', async () => {
    const id = await fieldIdOf('学历')
    const { outcomes } = await executeFill([{ fieldId: id, path: 'educations.0.degree' }], profile)
    expect(outcomes[0].status).toBe('filled')
    const sel = document.getElementById('degree') as HTMLSelectElement
    expect(sel.value).toBe('3')
  })

  it('radio:点击匹配选项', async () => {
    const id = await fieldIdOf('性别')
    const { outcomes } = await executeFill([{ fieldId: id, path: 'basic.gender' }], profile)
    expect(outcomes[0].status).toBe('filled')
    const checked = document.querySelector('input[name="gender"]:checked') as HTMLInputElement
    expect(checked.value).toBe('1')
  })

  it('checkbox:数组值勾选多个', async () => {
    const id = await fieldIdOf('技能')
    const { outcomes } = await executeFill([{ fieldId: id, path: 'skills' }], profile)
    expect(outcomes[0].status).toBe('filled')
    const checked = [...document.querySelectorAll('input[name="skill"]:checked')] as HTMLInputElement[]
    expect(checked.map((c) => c.value).sort()).toEqual(['a', 'b'])
  })

  it('date:YYYY-MM 填入 month 输入', async () => {
    const id = await fieldIdOf('毕业时间')
    const { outcomes } = await executeFill([{ fieldId: id, path: 'educations.0.endDate' }], profile)
    expect(outcomes[0].status).toBe('filled')
    expect((document.getElementById('grad') as HTMLInputElement).value).toBe('2025-06')
  })

  it('dropdown:打开后匹配并点击选项', async () => {
    const id = await fieldIdOf('政治面貌')
    const { outcomes } = await executeFill([{ fieldId: id, path: 'basic.politicalStatus' }], profile)
    expect(outcomes[0].status).toBe('filled')
  })

  it('textarea 填充', async () => {
    const id = await fieldIdOf('自我评价')
    const { outcomes } = await executeFill([{ fieldId: id, path: 'selfEvaluation' }], profile)
    expect(outcomes[0].status).toBe('filled')
    expect((document.getElementById('eval') as HTMLTextAreaElement).value).toBe('学习能力强')
  })

  it('档案为空的字段跳过', async () => {
    const id = await fieldIdOf('姓名')
    const { outcomes } = await executeFill([{ fieldId: id, path: 'basic.idNumber' }], profile)
    expect(outcomes[0].status).toBe('skipped')
    expect(outcomes[0].message).toContain('为空')
  })

  it('页面上不存在的 fieldId 失败', async () => {
    const { outcomes } = await executeFill([{ fieldId: 'f999', path: 'basic.name' }], profile)
    expect(outcomes[0].status).toBe('failed')
  })
})
