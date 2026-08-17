// 简历解析产物类型(与 Profile 字段同构的子集,便于合并进编辑器)

import type { Award, Education, Project, Work } from './profile'

export type { Award, Education, Project, Work }

export interface ParsedDraft {
  basic: Partial<{
    name: string
    phone: string
    email: string
    idNumber: string
  }>
  educations: Education[]
  works: Work[]
  projects: Project[]
  awards: Award[]
  skills: string[]
  selfEvaluation: string
}
