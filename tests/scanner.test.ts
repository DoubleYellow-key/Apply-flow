import { beforeAll, describe, expect, it } from 'vitest'
import { scanDocument } from '../src/scanner/scan'

// 模拟常见网申表单结构:antd 风格下拉、原生控件、radio 组、教育经历重复区块
const FIXTURE = `
<form id="app">
  <h2>基本信息</h2>
  <div class="ant-form-item">
    <div class="ant-col"><label for="name">* 姓名</label></div>
    <div class="ant-col"><input id="name" type="text"></div>
  </div>
  <div class="row">
    <label>性别</label>
    <label><input type="radio" name="gender" value="1">男</label>
    <label><input type="radio" name="gender" value="2">女</label>
  </div>
  <div class="row">
    <label>学历</label>
    <select id="degree">
      <option value="">请选择</option>
      <option>大专</option>
      <option>本科</option>
      <option>硕士研究生</option>
    </select>
  </div>
  <div class="row">
    <label>毕业院校</label>
    <div class="ant-select" id="school-select">
      <div class="ant-select-selector"><span>请选择</span></div>
      <input type="hidden" name="school">
    </div>
  </div>
  <div class="row"><label>出生日期</label><input type="date" id="birth"></div>
  <div class="row"><label>自我评价</label><textarea id="eval"></textarea></div>
  <div class="row"><label>简历附件</label><input type="file" id="resume-file"></div>

  <h2>教育经历</h2>
  <div id="edu-container">
    <div class="edu-item">
      <div class="cell"><label>学校</label><input class="school-in"></div>
      <div class="cell"><label>专业名称</label><input class="major-in"></div>
    </div>
    <div class="edu-item">
      <div class="cell"><label>学校</label><input class="school-in"></div>
      <div class="cell"><label>专业名称</label><input class="major-in"></div>
    </div>
    <button type="button" id="add-edu">添加</button>
  </div>
</form>
`

describe('scanDocument', () => {
  let result: ReturnType<typeof scanDocument>

  beforeAll(() => {
    document.body.innerHTML = FIXTURE
    result = scanDocument()
  })

  it('识别系统为 generic', () => {
    expect(result.system).toBe('generic')
  })

  it('扫描出全部字段,fieldId 为内容稳定键', () => {
    const labels = result.fields.map((f) => f.label)
    expect(labels).toContain('姓名')
    expect(labels).toContain('性别')
    expect(labels).toContain('学历')
    expect(labels).toContain('毕业院校')
    expect(labels).toContain('学校')
    const ids = result.fields.map((f) => f.fieldId)
    expect(new Set(ids).size).toBe(ids.length) // 无重复
    expect(result.fields.find((f) => f.label === '姓名')!.fieldId).toBe('top.姓名.text')
    expect(result.fields.find((f) => f.label === '毕业院校')!.fieldId).toBe('top.毕业院校.dropdown')
  })

  it('控件类型与选项正确', () => {
    const byLabel = (l: string) => result.fields.find((f) => f.label === l)!
    expect(byLabel('姓名').kind).toBe('text')
    expect(byLabel('姓名').required).toBe(true)
    expect(byLabel('性别').kind).toBe('radio')
    expect(byLabel('性别').options).toEqual(['男', '女'])
    expect(byLabel('学历').kind).toBe('select')
    expect(byLabel('学历').options).toEqual(['请选择', '大专', '本科', '硕士研究生'])
    expect(byLabel('毕业院校').kind).toBe('dropdown')
    expect(byLabel('出生日期').kind).toBe('date')
    expect(byLabel('自我评价').kind).toBe('text')
    expect(byLabel('简历附件').kind).toBe('file')
  })

  it('下拉容器内的 hidden input 被吞并不重复出现', () => {
    const schoolFields = result.fields.filter((f) => f.label === '学校' && !f.repeaterId)
    expect(schoolFields).toHaveLength(0)
  })

  it('教育经历识别为重复区块,两行字段带 repeaterId 与 rowIndex', () => {
    const eduFields = result.fields.filter((f) => f.repeaterId === 'educations')
    expect(eduFields).toHaveLength(4)
    expect(eduFields.filter((f) => f.rowIndex === 0)).toHaveLength(2)
    expect(eduFields.filter((f) => f.rowIndex === 1)).toHaveLength(2)
    const school0 = eduFields.find((f) => f.rowIndex === 0 && f.label === '学校')
    expect(school0?.kind).toBe('text')
    expect(school0?.fieldId).toBe('educations.0.学校.text')
  })

  it('生成结构签名', () => {
    expect(result.signature).toMatch(/^sig_/)
  })
})
