// 简历纯文本 -> 结构化档案草稿的启发式解析器
// 定位:按常见中文简历版式提取草稿,结果交由档案编辑器人工校对,不追求全自动准确

import type { Award, Education, ParsedDraft, Project, Work } from './draft-types'
import { normalizeDate } from './date-utils'

/** 章节 headings:短行 + 关键词 */
const SECTION_DEFS: Array<{ key: string; re: RegExp }> = [
  { key: 'education', re: /教育(背景|经历|情况)?|学习(经历|背景)/ },
  { key: 'works', re: /(实习|工作|实践)(经历|经验|背景)?/ },
  { key: 'projects', re: /(项目|科研)(经历|经验|背景)?/ },
  { key: 'awards', re: /(获奖|荣誉|奖项|证书|奖学金)(情况|经历)?/ },
  { key: 'skills', re: /(专业)?技能(特长)?|技能(水平)?/ },
  { key: 'selfEvaluation', re: /(自我|个人)(评价|介绍|简介)/ },
]

const DATE_RANGE_RE =
  /(\d{4}\s*[./年-]\s*\d{1,2}?)?\s*(?:[-–—~至到]|至今)\s*(\d{4}\s*[./年-]\s*\d{1,2}?|至今)?/

const SCHOOL_RE = /([\u4e00-\u9fa5A-Za-z（）()]{2,20}?(?:大学|学院|学校|研究院|研究所))/
const DEGREE_RE = /(博士|硕士研究生|硕士|研究生|本科|大专|专科|学士)/
const COMPANY_RE =
  /([\u4e00-\u9fa5A-Za-z0-9（）()]{2,24}(?:有限公司|责任公司|股份公司|公司|集团|银行|证券|事务所|研究院|工作室|事业部|实验室|科技|基金))/
const PHONE_RE = /1[3-9]\d{9}/
const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/
const ID_RE = /\d{17}[\dXx]/

/** 判断一行是否是章节标题 */
function sectionKeyOf(line: string): string | null {
  const stripped = line.replace(/[\s*【】\[\]—\-_.]/g, '')
  if (stripped.length > 12) return null
  for (const def of SECTION_DEFS) {
    if (def.re.test(stripped)) return def.key
  }
  return null
}

/** 从一行中提取日期区间,返回归一化的起止与剩余文本 */
function extractDateRange(line: string): { start: string; end: string; rest: string } {
  const m = line.match(
    /(\d{4}\s*[./年]\s*\d{1,2}\s*月?)?\s*[-–—~至到]\s*(\d{4}\s*[./年]\s*\d{1,2}\s*月?|至今)?/,
  )
  if (!m || (!m[1] && !m[2])) return { start: '', end: '', rest: line }
  const start = m[1] ? normalizeDate(m[1]) : ''
  const end = m[2] && m[2] !== '至今' ? normalizeDate(m[2]) : ''
  const rest = (line.slice(0, m.index) + ' ' + line.slice(m.index + m[0].length)).trim()
  return { start, end, rest }
}

function splitSkills(lines: string[]): string[] {
  const tags: string[] = []
  for (const line of lines) {
    for (const part of line.split(/[、,，;；/|]/)) {
      const t = part.trim()
      if (t) tags.push(t)
    }
  }
  return tags
}

function parseEducationLines(lines: string[]): Education[] {
  const results: Education[] = []
  let current: Education | null = null
  for (const line of lines) {
    const schoolM = line.match(SCHOOL_RE)
    const { start, end, rest } = extractDateRange(line)
    if (schoolM) {
      if (current) results.push(current)
      const degreeM = rest.match(DEGREE_RE)
      // 专业:学校与学历关键词之间的文本,如「广州大学 大数据技术与工程 硕士」
      let major = ''
      const schoolEnd = rest.indexOf(schoolM[1]) + schoolM[1].length
      const afterSchool = rest.slice(schoolEnd)
      const degreeIdx = degreeM ? afterSchool.indexOf(degreeM[1]) : -1
      major = (degreeIdx >= 0 ? afterSchool.slice(0, degreeIdx) : afterSchool)
        .replace(/[|\s·,，、]/g, '')
        .trim()
      current = {
        school: schoolM[1],
        college: '',
        major,
        degree: degreeM ? degreeM[1].replace('研究生', '硕士') : '',
        degreeType: '',
        startDate: start,
        endDate: end,
        rank: '',
        gpa: '',
        mode: '',
      }
    } else if (current && !current.college && /学院/.test(line) && !line.includes('大学')) {
      current.college = line.replace(/学院$/, '') + '学院'
    }
  }
  if (current) results.push(current)
  return results
}

function parseEntryBlocks(
  lines: string[],
  isHead: (line: string) => boolean,
): string[][] {
  const blocks: string[][] = []
  let current: string[] | null = null
  for (const line of lines) {
    if (isHead(line)) {
      if (current) blocks.push(current)
      current = [line]
    } else if (current) {
      current.push(line)
    }
  }
  if (current) blocks.push(current)
  return blocks
}

function parseWorks(lines: string[]): Work[] {
  const blocks = parseEntryBlocks(lines, (line) => !!line.match(COMPANY_RE) || /\d{4}\s*[./年]/.test(line))
  return blocks.map((block) => {
    const head = block[0]
    const { start, end, rest } = extractDateRange(head)
    const companyM = rest.match(COMPANY_RE)
    // 职位:公司名之后、分隔符(| · /)之间的文本
    let position = ''
    if (companyM) {
      const after = rest.slice(rest.indexOf(companyM[1]) + companyM[1].length)
      position = after
        .replace(/^(?:[|\s·/,，、-])+/, '')
        .split(/[|\s·/,，、]/)[0]
        .trim()
    }
    return {
      company: companyM ? companyM[1] : rest.trim(),
      position,
      startDate: start,
      endDate: end,
      description: block.slice(1).join('\n'),
    }
  })
}

function parseProjects(lines: string[]): Project[] {
  const blocks = parseEntryBlocks(lines, (line) => /\d{4}\s*[./年]/.test(line))
  return blocks.map((block) => {
    const { start, end, rest } = extractDateRange(block[0])
    const parts = rest.split(/[|\s·]{1,3}/).filter(Boolean)
    return {
      name: parts[0] ?? rest.trim(),
      role: parts.slice(1).join(' '),
      startDate: start,
      endDate: end,
      description: block.slice(1).join('\n'),
    }
  })
}

function parseAwards(lines: string[]): Award[] {
  const awards: Award[] = []
  for (const line of lines) {
    // 获奖行常见形态:「2023.10 XXX奖」或「XXX奖 2023.10」,日期前后无分隔符
    const dateM = line.match(/(\d{4}\s*[./年]\s*\d{1,2}\s*月?)/)
    const date = dateM ? normalizeDate(dateM[1]) : ''
    const name = (dateM ? line.replace(dateM[1], ' ') : line).replace(/[、;；,，\s]+$/, '').trim()
    if (name) awards.push({ name, date })
  }
  return awards
}

/** 提取姓名:首个 2-4 个纯汉字且不含关键词的短行 */
function extractName(lines: string[]): string {
  for (const line of lines.slice(0, 8)) {
    const t = line.replace(/姓名[:：]/, '').trim()
    if (/^[\u4e00-\u9fa5]{2,4}$/.test(t) && !/简历|求职/.test(t)) return t
  }
  return ''
}

export function parseResumeText(text: string): ParsedDraft {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  const phone = text.match(PHONE_RE)?.[0] ?? ''
  const email = text.match(EMAIL_RE)?.[0] ?? ''
  const idNumber = text.match(ID_RE)?.[0] ?? ''
  const name = extractName(lines)

  // 按章节切分
  const sections = new Map<string, string[]>()
  let currentKey = '_top'
  for (const line of lines) {
    const key = sectionKeyOf(line)
    if (key) {
      currentKey = key
      sections.set(key, [])
    } else {
      const arr = sections.get(currentKey) ?? []
      arr.push(line)
      sections.set(currentKey, arr)
    }
  }

  const educations = parseEducationLines(sections.get('education') ?? lines)
  const works = parseWorks(sections.get('works') ?? [])
  const projects = parseProjects(sections.get('projects') ?? [])
  const awards = parseAwards(sections.get('awards') ?? [])
  const skills = splitSkills(sections.get('skills') ?? [])
  const selfEvaluation = (sections.get('selfEvaluation') ?? []).join('\n')

  return {
    basic: { name, phone, email, idNumber },
    educations,
    works,
    projects,
    awards,
    skills,
    selfEvaluation,
  }
}
