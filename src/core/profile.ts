// 结构化档案 schema:填表引擎的唯一数据源
// 字段路径约定(matcher 依赖):basic.name / educations.0.school / works.1.company ...

/** 证件照/附件统一结构(dataUrl 含 base64 前缀) */
export interface Attachment {
  name: string
  mime: string
  dataUrl: string
}

export interface BasicInfo {
  name: string
  gender: string // 男/女
  birthDate: string // YYYY-MM-DD
  nationality: string // 民族
  politicalStatus: string // 政治面貌:中共党员/中共预备党员/共青团员/群众
  idNumber: string // 身份证号
  phone: string
  email: string
  maritalStatus: string // 未婚/已婚
  nativePlace: string // 籍贯
  originPlace: string // 生源地
  currentCity: string // 现居城市
  height: string // cm,部分网申要求
  photo?: Attachment // 证件照
}

export interface Education {
  school: string
  college: string // 学院
  major: string
  degree: string // 学历:博士/硕士/本科/大专
  degreeType: string // 学位:博士/硕士/学士
  startDate: string // YYYY-MM
  endDate: string
  rank: string // 成绩排名,如 前10%
  gpa: string
  mode: string // 培养方式:全日制/非全日制
}

export interface Work {
  company: string
  position: string
  startDate: string // YYYY-MM
  endDate: string
  description: string
}

export interface Project {
  name: string
  role: string
  startDate: string
  endDate: string
  description: string
}

export interface Award {
  name: string
  date: string // YYYY-MM
}

export interface FamilyMember {
  relation: string // 父亲/母亲/...
  name: string
  age: string
  company: string // 工作单位
  position: string // 职务
  politicalStatus: string
}

export interface JobIntention {
  city: string
  position: string
  salary: string
  availability: string // 到岗时间
}

/** 开放题答案(按问题关键词匹配) */
export interface OpenAnswer {
  id: string
  keywords: string[]
  question: string
  answer: string
}

export interface Profile {
  version: number
  basic: BasicInfo
  educations: Education[]
  works: Work[]
  projects: Project[]
  awards: Award[]
  skills: string[]
  family: FamilyMember[]
  intention: JobIntention
  selfEvaluation: string
  answers: OpenAnswer[]
  /** 命名附件:resume/transcript/cet4 等自定义 key -> 附件 */
  attachments: Record<string, Attachment>
}

export const PROFILE_VERSION = 1

export function createEmptyProfile(): Profile {
  return {
    version: PROFILE_VERSION,
    basic: {
      name: '',
      gender: '',
      birthDate: '',
      nationality: '汉族',
      politicalStatus: '',
      idNumber: '',
      phone: '',
      email: '',
      maritalStatus: '未婚',
      nativePlace: '',
      originPlace: '',
      currentCity: '',
      height: '',
    },
    educations: [],
    works: [],
    projects: [],
    awards: [],
    skills: [],
    family: [],
    intention: { city: '', position: '', salary: '', availability: '' },
    selfEvaluation: '',
    answers: [],
    attachments: {},
  }
}

/** 档案字段路径 -> 中文名称(编辑器与手动映射下拉共用) */
export const FIELD_LABELS: Record<string, string> = {
  'basic.name': '姓名',
  'basic.gender': '性别',
  'basic.birthDate': '出生日期',
  'basic.nationality': '民族',
  'basic.politicalStatus': '政治面貌',
  'basic.idNumber': '身份证号',
  'basic.phone': '手机号',
  'basic.email': '邮箱',
  'basic.maritalStatus': '婚姻状况',
  'basic.nativePlace': '籍贯',
  'basic.originPlace': '生源地',
  'basic.currentCity': '现居城市',
  'basic.height': '身高(cm)',
  'basic.photo': '证件照',
  'intention.city': '期望城市',
  'intention.position': '期望岗位',
  'intention.salary': '期望薪资',
  'intention.availability': '到岗时间',
  'selfEvaluation': '自我评价',
}

/** 重复区块条目的字段 -> 中文(用于手动映射下拉的条目字段) */
export const ITEM_FIELD_LABELS: Record<string, Record<string, string>> = {
  educations: {
    school: '学校',
    college: '学院',
    major: '专业',
    degree: '学历',
    degreeType: '学位',
    startDate: '开始时间',
    endDate: '结束时间',
    rank: '成绩排名',
    gpa: 'GPA',
    mode: '培养方式',
  },
  works: {
    company: '公司',
    position: '职位',
    startDate: '开始时间',
    endDate: '结束时间',
    description: '工作内容',
  },
  projects: {
    name: '项目名称',
    role: '角色',
    startDate: '开始时间',
    endDate: '结束时间',
    description: '项目描述',
  },
  awards: { name: '奖项名称', date: '获奖时间' },
  family: {
    relation: '关系',
    name: '姓名',
    age: '年龄',
    company: '工作单位',
    position: '职务',
    politicalStatus: '政治面貌',
  },
}

/** 按路径读取档案中的值(点分路径,数组下标为数字段) */
export function getByPath(profile: Profile, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc === null || acc === undefined) return undefined
    return (acc as Record<string, unknown>)[key]
  }, profile)
}

/** 归档字段是否为空串/空数组/undefined */
export function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}
