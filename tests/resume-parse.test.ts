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
