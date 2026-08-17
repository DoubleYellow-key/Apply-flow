import { beforeEach, describe, expect, it } from 'vitest'
import { executeFill } from '../src/filler/fill'
import { createEmptyProfile, type Profile } from '../src/core/profile'

// 页面上教育经历只有 1 行,点击「添加教育经历」新增一行(模拟 React 站点行为)
const FIXTURE = `
<form id="app">
  <div class="row"><label for="name">姓名</label><input id="name" type="text"></div>
  <h3>教育经历</h3>
  <div id="edu-container">
    <div class="edu-item">
      <div class="cell"><label>学校</label><input class="school-in"></div>
      <div class="cell"><label>专业名称</label><input class="major-in"></div>
    </div>
    <button type="button" id="add-edu">添加教育经历</button>
  </div>
</form>
`

describe('executeFill 重复区块自动增行', () => {
  let profile: Profile
  let rowCount: number

  beforeEach(() => {
    document.body.innerHTML = FIXTURE
    rowCount = 0
    profile = createEmptyProfile()
    profile.basic.name = '黄信凯'
    profile.educations = [
      {
        school: '广州大学', college: '', major: '大数据技术与工程', degree: '硕士', degreeType: '硕士',
        startDate: '', endDate: '', rank: '', gpa: '', mode: '',
      },
      {
        school: '江西财经大学', college: '', major: '信息管理与信息系统', degree: '本科', degreeType: '学士',
        startDate: '', endDate: '', rank: '', gpa: '', mode: '',
      },
    ]
    // 模拟站点:点击添加按钮追加一行(150ms 后,模拟 React 异步渲染)
    const btn = document.getElementById('add-edu')!
    btn.addEventListener('click', () => {
      rowCount += 1
      setTimeout(() => {
        const item = document.createElement('div')
        item.className = 'edu-item'
        item.innerHTML = `
          <div class="cell"><label>学校</label><input class="school-in"></div>
          <div class="cell"><label>专业名称</label><input class="major-in"></div>`
        btn.parentElement!.insertBefore(item, btn)
      }, 150)
    })
  })

  it('档案 2 条教育经历,页面 1 行:自动增行并填充两行', async () => {
    const { outcomes } = await executeFill([], profile)
    const filled = outcomes.filter((o) => o.status === 'filled')
    expect(document.querySelectorAll('.edu-item')).toHaveLength(2)
    const schools = [...document.querySelectorAll('.school-in')].map((i) => (i as HTMLInputElement).value)
    expect(schools).toEqual(['广州大学', '江西财经大学'])
    const majors = [...document.querySelectorAll('.major-in')].map((i) => (i as HTMLInputElement).value)
    expect(majors).toEqual(['大数据技术与工程', '信息管理与信息系统'])
    expect(filled.length).toBeGreaterThanOrEqual(5) // 姓名 + 2行×2字段
  })

  it('空指令时顶层字段也按规则匹配填充', async () => {
    const { outcomes } = await executeFill([], profile)
    expect((document.getElementById('name') as HTMLInputElement).value).toBe('黄信凯')
    expect(outcomes.some((o) => o.label === '姓名' && o.status === 'filled')).toBe(true)
  })
})
