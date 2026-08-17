// 档案编辑器的各区块组件:每个组件管理 Profile 的一个切片

import type {
  Award,
  BasicInfo,
  Education,
  FamilyMember,
  JobIntention,
  OpenAnswer,
  Profile,
  Project,
  Work,
} from '../core/profile'
import { fileToDataUrl } from '../core/file-utils'
import { DateInput, ItemCard, Section, SelectInput, TextInput, TextareaInput } from './ui'

const GENDERS = ['男', '女']
const POLITICAL = ['中共党员', '中共预备党员', '共青团员', '群众', '民主党派成员']
const MARITAL = ['未婚', '已婚', '离异']
const DEGREES = ['博士研究生', '硕士研究生', '本科', '大专']
const DEGREE_TYPES = ['博士', '硕士', '学士', '无']
const MODES = ['全日制', '非全日制']
const RELATIONS = ['父亲', '母亲', '兄弟姐妹', '配偶', '子女', '其他']

export function BasicSection({ value, onChange }: { value: BasicInfo; onChange: (v: BasicInfo) => void }) {
  const set = (patch: Partial<BasicInfo>) => onChange({ ...value, ...patch })

  async function uploadPhoto(file: File | undefined) {
    if (!file) return
    set({ photo: { name: file.name, mime: file.type, dataUrl: await fileToDataUrl(file) } })
  }

  return (
    <Section title="基本信息">
      <div className="grid2">
        <TextInput label="姓名" value={value.name} onChange={(v) => set({ name: v })} />
        <SelectInput label="性别" value={value.gender} options={GENDERS} onChange={(v) => set({ gender: v })} />
        <DateInput label="出生日期" kind="date" value={value.birthDate} onChange={(v) => set({ birthDate: v })} />
        <TextInput label="民族" value={value.nationality} onChange={(v) => set({ nationality: v })} />
        <SelectInput label="政治面貌" value={value.politicalStatus} options={POLITICAL} onChange={(v) => set({ politicalStatus: v })} />
        <TextInput label="身份证号" value={value.idNumber} onChange={(v) => set({ idNumber: v })} />
        <TextInput label="手机号" value={value.phone} onChange={(v) => set({ phone: v })} />
        <TextInput label="邮箱" value={value.email} onChange={(v) => set({ email: v })} />
        <SelectInput label="婚姻状况" value={value.maritalStatus} options={MARITAL} onChange={(v) => set({ maritalStatus: v })} />
        <TextInput label="籍贯" value={value.nativePlace} onChange={(v) => set({ nativePlace: v })} placeholder="如:广东省广州市" />
        <TextInput label="生源地" value={value.originPlace} onChange={(v) => set({ originPlace: v })} />
        <TextInput label="现居城市" value={value.currentCity} onChange={(v) => set({ currentCity: v })} />
        <TextInput label="身高(cm)" value={value.height} onChange={(v) => set({ height: v })} />
      </div>
      <div className="row">
        <span className="row-label">证件照</span>
        <span className="row-control">
          {value.photo ? (
            <span className="photo-wrap">
              <img src={value.photo.dataUrl} alt="证件照" />
              <button className="ghost danger" onClick={() => set({ photo: undefined })}>
                移除
              </button>
            </span>
          ) : (
            <input type="file" accept="image/*" onChange={(e) => uploadPhoto(e.target.files?.[0])} />
          )}
        </span>
      </div>
    </Section>
  )
}

function emptyEducation(): Education {
  return { school: '', college: '', major: '', degree: '', degreeType: '', startDate: '', endDate: '', rank: '', gpa: '', mode: '' }
}

export function EducationsSection({ value, onChange }: { value: Education[]; onChange: (v: Education[]) => void }) {
  const setItem = (i: number, patch: Partial<Education>) => {
    onChange(value.map((item, idx) => (idx === i ? { ...item, ...patch } : item)))
  }
  return (
    <Section title="教育经历" hint="按时间倒序,硕士在前" onAdd={() => onChange([...value, emptyEducation()])}>
      {value.map((edu, i) => (
        <ItemCard key={i} index={i} onRemove={() => onChange(value.filter((_, idx) => idx !== i))}>
          <div className="grid2">
            <TextInput label="学校" value={edu.school} onChange={(v) => setItem(i, { school: v })} />
            <TextInput label="学院" value={edu.college} onChange={(v) => setItem(i, { college: v })} />
            <TextInput label="专业" value={edu.major} onChange={(v) => setItem(i, { major: v })} />
            <SelectInput label="学历" value={edu.degree} options={DEGREES} onChange={(v) => setItem(i, { degree: v })} />
            <SelectInput label="学位" value={edu.degreeType} options={DEGREE_TYPES} onChange={(v) => setItem(i, { degreeType: v })} />
            <SelectInput label="培养方式" value={edu.mode} options={MODES} onChange={(v) => setItem(i, { mode: v })} />
            <DateInput label="开始时间" value={edu.startDate} onChange={(v) => setItem(i, { startDate: v })} />
            <DateInput label="结束时间" value={edu.endDate} onChange={(v) => setItem(i, { endDate: v })} />
            <TextInput label="成绩排名" value={edu.rank} onChange={(v) => setItem(i, { rank: v })} placeholder="如:前10%" />
            <TextInput label="GPA" value={edu.gpa} onChange={(v) => setItem(i, { gpa: v })} />
          </div>
        </ItemCard>
      ))}
    </Section>
  )
}

function emptyWork(): Work {
  return { company: '', position: '', startDate: '', endDate: '', description: '' }
}

export function WorksSection({ value, onChange }: { value: Work[]; onChange: (v: Work[]) => void }) {
  const setItem = (i: number, patch: Partial<Work>) => {
    onChange(value.map((item, idx) => (idx === i ? { ...item, ...patch } : item)))
  }
  return (
    <Section title="实习/工作经历" onAdd={() => onChange([...value, emptyWork()])}>
      {value.map((w, i) => (
        <ItemCard key={i} index={i} onRemove={() => onChange(value.filter((_, idx) => idx !== i))}>
          <div className="grid2">
            <TextInput label="公司" value={w.company} onChange={(v) => setItem(i, { company: v })} />
            <TextInput label="职位" value={w.position} onChange={(v) => setItem(i, { position: v })} />
            <DateInput label="开始时间" value={w.startDate} onChange={(v) => setItem(i, { startDate: v })} />
            <DateInput label="结束时间" value={w.endDate} onChange={(v) => setItem(i, { endDate: v })} />
          </div>
          <TextareaInput label="工作内容" value={w.description} onChange={(v) => setItem(i, { description: v })} />
        </ItemCard>
      ))}
    </Section>
  )
}

function emptyProject(): Project {
  return { name: '', role: '', startDate: '', endDate: '', description: '' }
}

export function ProjectsSection({ value, onChange }: { value: Project[]; onChange: (v: Project[]) => void }) {
  const setItem = (i: number, patch: Partial<Project>) => {
    onChange(value.map((item, idx) => (idx === i ? { ...item, ...patch } : item)))
  }
  return (
    <Section title="项目经历" onAdd={() => onChange([...value, emptyProject()])}>
      {value.map((p, i) => (
        <ItemCard key={i} index={i} onRemove={() => onChange(value.filter((_, idx) => idx !== i))}>
          <div className="grid2">
            <TextInput label="项目名称" value={p.name} onChange={(v) => setItem(i, { name: v })} />
            <TextInput label="担任角色" value={p.role} onChange={(v) => setItem(i, { role: v })} />
            <DateInput label="开始时间" value={p.startDate} onChange={(v) => setItem(i, { startDate: v })} />
            <DateInput label="结束时间" value={p.endDate} onChange={(v) => setItem(i, { endDate: v })} />
          </div>
          <TextareaInput label="项目描述" value={p.description} onChange={(v) => setItem(i, { description: v })} />
        </ItemCard>
      ))}
    </Section>
  )
}

export function AwardsSection({ value, onChange }: { value: Award[]; onChange: (v: Award[]) => void }) {
  const setItem = (i: number, patch: Partial<Award>) => {
    onChange(value.map((item, idx) => (idx === i ? { ...item, ...patch } : item)))
  }
  return (
    <Section title="获奖/证书" onAdd={() => onChange([...value, { name: '', date: '' }])}>
      {value.map((a, i) => (
        <ItemCard key={i} index={i} onRemove={() => onChange(value.filter((_, idx) => idx !== i))}>
          <div className="grid2">
            <TextInput label="名称" value={a.name} onChange={(v) => setItem(i, { name: v })} />
            <DateInput label="时间" value={a.date} onChange={(v) => setItem(i, { date: v })} />
          </div>
        </ItemCard>
      ))}
    </Section>
  )
}

export function SkillsSection({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <Section title="专业技能" hint="用顿号(、)分隔">
      <TextareaInput
        label="技能列表"
        rows={3}
        value={value.join('、')}
        onChange={(v) => onChange(v.split(/[、,，;；]/).map((s) => s.trim()).filter(Boolean))}
      />
    </Section>
  )
}

export function FamilySection({ value, onChange }: { value: FamilyMember[]; onChange: (v: FamilyMember[]) => void }) {
  const setItem = (i: number, patch: Partial<FamilyMember>) => {
    onChange(value.map((item, idx) => (idx === i ? { ...item, ...patch } : item)))
  }
  return (
    <Section title="家庭信息" hint="央国企网申常需" onAdd={() => onChange([...value, { relation: '', name: '', age: '', company: '', position: '', politicalStatus: '' }])}>
      {value.map((f, i) => (
        <ItemCard key={i} index={i} onRemove={() => onChange(value.filter((_, idx) => idx !== i))}>
          <div className="grid2">
            <SelectInput label="关系" value={f.relation} options={RELATIONS} onChange={(v) => setItem(i, { relation: v })} />
            <TextInput label="姓名" value={f.name} onChange={(v) => setItem(i, { name: v })} />
            <TextInput label="年龄" value={f.age} onChange={(v) => setItem(i, { age: v })} />
            <TextInput label="工作单位" value={f.company} onChange={(v) => setItem(i, { company: v })} />
            <TextInput label="职务" value={f.position} onChange={(v) => setItem(i, { position: v })} />
            <SelectInput label="政治面貌" value={f.politicalStatus} options={POLITICAL} onChange={(v) => setItem(i, { politicalStatus: v })} />
          </div>
        </ItemCard>
      ))}
    </Section>
  )
}

export function IntentionSection({ value, onChange }: { value: JobIntention; onChange: (v: JobIntention) => void }) {
  const set = (patch: Partial<JobIntention>) => onChange({ ...value, ...patch })
  return (
    <Section title="求职意向">
      <div className="grid2">
        <TextInput label="期望城市" value={value.city} onChange={(v) => set({ city: v })} />
        <TextInput label="期望岗位" value={value.position} onChange={(v) => set({ position: v })} />
        <TextInput label="期望薪资" value={value.salary} onChange={(v) => set({ salary: v })} placeholder="如:15-25k·14薪" />
        <TextInput label="到岗时间" value={value.availability} onChange={(v) => set({ availability: v })} placeholder="如:2026年7月" />
      </div>
    </Section>
  )
}

export function SelfEvalSection({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Section title="自我评价">
      <TextareaInput label="内容" rows={6} value={value} onChange={onChange} />
    </Section>
  )
}

export function AnswersSection({ value, onChange }: { value: OpenAnswer[]; onChange: (v: OpenAnswer[]) => void }) {
  const setItem = (i: number, patch: Partial<OpenAnswer>) => {
    onChange(value.map((item, idx) => (idx === i ? { ...item, ...patch } : item)))
  }
  return (
    <Section
      title="开放题答案库"
      hint="按问题关键词匹配自动填入,如:自我介绍/职业规划/优缺点"
      onAdd={() => onChange([...value, { id: crypto.randomUUID(), keywords: [], question: '', answer: '' }])}
    >
      {value.map((a, i) => (
        <ItemCard key={a.id} index={i} onRemove={() => onChange(value.filter((_, idx) => idx !== i))}>
          <TextInput
            label="关键词"
            value={a.keywords.join(',')}
            onChange={(v) => setItem(i, { keywords: v.split(/[,，]/).map((s) => s.trim()).filter(Boolean) })}
            placeholder="用逗号分隔,如:职业规划,规划"
          />
          <TextInput label="问题示例" value={a.question} onChange={(v) => setItem(i, { question: v })} />
          <TextareaInput label="答案" value={a.answer} onChange={(v) => setItem(i, { answer: v })} rows={5} />
        </ItemCard>
      ))}
    </Section>
  )
}

export function AttachmentsSection({ value, onChange }: { value: Profile['attachments']; onChange: (v: Profile['attachments']) => void }) {
  async function upload(key: string, file: File | undefined) {
    if (!file || !key.trim()) return
    onChange({ ...value, [key.trim()]: { name: file.name, mime: file.type, dataUrl: await fileToDataUrl(file) } })
  }

  return (
    <Section title="常用附件" hint="简历PDF/成绩单/证书等,填写页可一键上传">
      <div className="row">
        <span className="row-label">新增附件</span>
        <span className="row-control attach-add">
          <input className="attach-key" id="attach-key" placeholder="附件标识,如 resume" />
          <input type="file" onChange={(e) => upload((document.getElementById('attach-key') as HTMLInputElement).value, e.target.files?.[0])} />
        </span>
      </div>
      {Object.entries(value).map(([key, att]) => (
        <div className="row" key={key}>
          <span className="row-label">{key}</span>
          <span className="row-control">
            {att.name}
            <button className="ghost danger" onClick={() => {
              const next = { ...value }
              delete next[key]
              onChange(next)
            }}>
              删除
            </button>
          </span>
        </div>
      ))}
    </Section>
  )
}
