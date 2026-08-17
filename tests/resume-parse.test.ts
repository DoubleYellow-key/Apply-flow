import { describe, expect, it } from 'vitest'
import { parseResumeText } from '../src/core/resume-parse'

// 按用户简历版式构造的样例文本(PDF/DOCX 提取后的形态)
const SAMPLE = `
黄信凯
男 | 2000年5月 | 中共党员 | 广东广州
手机:13800138000 | 邮箱:huangxinkai@example.com

教育背景
2022.09-2025.06 广州大学 大数据技术与工程 硕士
2018.09-2022.06 江西财经大学 信息管理与信息系统 本科
主修课程:数据结构、数据库原理、机器学习

实习经历
2024.06-2024.09 某私募基金管理有限公司 后端开发实习生
1. 负责托管数据平台 FastAPI 接口开发,设计 12 个 REST 接口
2. 使用 Vue3 搭建数据看板,支撑日均 3000 次查询

项目经历
2023.03-2024.01 私募基金托管数据平台 | 核心开发
1. 搭建 FastAPI + Vue3 + MySQL 全栈架构
2. 实现净值对账自动化,人工核对时间从 2 小时降至 5 分钟

获奖情况
2023.10 全国大学生数学建模竞赛省级一等奖
2022.05 校级一等奖学金

专业技能
Python、FastAPI、SQL、机器学习、数据分析

自我评价
学习能力强,对数据系统开发有浓厚兴趣,具备扎实的工程能力。
`

describe('parseResumeText', () => {
  const draft = parseResumeText(SAMPLE)

  it('提取基本信息', () => {
    expect(draft.basic.name).toBe('黄信凯')
    expect(draft.basic.phone).toBe('13800138000')
    expect(draft.basic.email).toBe('huangxinkai@example.com')
  })

  it('提取两段教育经历', () => {
    expect(draft.educations).toHaveLength(2)
    const [master, bachelor] = draft.educations
    expect(master.school).toBe('广州大学')
    expect(master.major).toBe('大数据技术与工程')
    expect(master.degree).toBe('硕士')
    expect(master.startDate).toBe('2022-09')
    expect(master.endDate).toBe('2025-06')
    expect(bachelor.school).toBe('江西财经大学')
    expect(bachelor.degree).toBe('本科')
  })

  it('提取实习经历', () => {
    expect(draft.works).toHaveLength(1)
    expect(draft.works[0].company).toBe('某私募基金管理有限公司')
    expect(draft.works[0].position).toBe('后端开发实习生')
    expect(draft.works[0].startDate).toBe('2024-06')
    expect(draft.works[0].description).toContain('FastAPI')
  })

  it('提取项目经历', () => {
    expect(draft.projects).toHaveLength(1)
    expect(draft.projects[0].name).toContain('托管数据平台')
    expect(draft.projects[0].role).toContain('核心开发')
  })

  it('提取获奖与技能与自我评价', () => {
    expect(draft.awards).toHaveLength(2)
    expect(draft.awards[0].name).toContain('数学建模')
    expect(draft.awards[0].date).toBe('2023-10')
    expect(draft.skills).toContain('Python')
    expect(draft.skills.length).toBeGreaterThanOrEqual(5)
    expect(draft.selfEvaluation).toContain('学习能力强')
  })
})

// 真实简历版式(取自 docs/黄信凯简历.pdf 的 pdfjs 提取结果):
// 日期单独成行、公司名下一行、项目日期在行尾、自我评价叫「个人优势」
const REAL_LIKE = `
黄信凯
男 | 年龄：24岁 | 15089509332 | 1642964789@qq.com
个人优势
1. 熟悉 Go 语言及高并发编程,具备使用 Gin 等 Web 框架开发 RESTful API 的经验。
2. 熟悉 Python 语言,具备 FastAPI、Flask 等后端框架开发经验。

实习经历
2026.07-至今
巨量均衡私募证券基金管理（珠海）有限公司 全栈
内容：
多券商 API 数据处理： 对接 6 家托管机构 API,实现持仓、净值等数据自动拉取。
实习成果：
建立完整运营数据链路,支撑多托管来源的统一查询。

项目经历
云原生网络安全蜜网系统（组内实验室项目） 项目开发 2024.11-至今
内容:
项目描述：云原生架构的分布式蜜场系统。
技术栈：Go（Gin）+ Vue.js + Kubernetes + Docker

教育背景
2022.09-2025.06 广州大学 大数据技术与工程 硕士
2018.09-2022.06 江西财经大学 信息管理与信息系统 本科
`

describe('parseResumeText(真实版式)', () => {
  const draft = parseResumeText(REAL_LIKE)

  it('头部行提取姓名/性别/手机/邮箱', () => {
    expect(draft.basic.name).toBe('黄信凯')
    expect(draft.basic.gender).toBe('男')
    expect(draft.basic.phone).toBe('15089509332')
    expect(draft.basic.email).toBe('1642964789@qq.com')
  })

  it('「个人优势」并入自我评价', () => {
    expect(draft.selfEvaluation).toContain('Go 语言')
  })

  it('日期单独成行的实习经历:公司与职位正确聚合', () => {
    expect(draft.works).toHaveLength(1)
    expect(draft.works[0].company).toBe('巨量均衡私募证券基金管理（珠海）有限公司')
    expect(draft.works[0].position).toBe('全栈')
    expect(draft.works[0].startDate).toBe('2026-07')
    expect(draft.works[0].endDate).toBe('') // 至今 -> 留空人工填
    expect(draft.works[0].description).toContain('多券商')
  })

  it('日期在行尾的项目经历', () => {
    expect(draft.projects).toHaveLength(1)
    expect(draft.projects[0].name).toContain('蜜网系统')
    expect(draft.projects[0].role).toBe('项目开发')
    expect(draft.projects[0].startDate).toBe('2024-11')
  })

  it('教育经历在文末也能提取', () => {
    expect(draft.educations).toHaveLength(2)
    expect(draft.educations[0].school).toBe('广州大学')
  })
})
