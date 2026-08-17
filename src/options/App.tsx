import { useEffect, useRef, useState } from 'react'
import { STORAGE_KEYS, storage } from '../core/storage'
import { createEmptyProfile, type Profile } from '../core/profile'
import { sanitizeProfile, mergeDraft } from '../core/profile-merge'
import { parseResumeText } from '../core/resume-parse'
import { extractTextFromFile } from '../core/extractText'
import {
  AnswersSection,
  AttachmentsSection,
  AwardsSection,
  BasicSection,
  EducationsSection,
  FamilySection,
  IntentionSection,
  ProjectsSection,
  SelfEvalSection,
  SkillsSection,
  WorksSection,
} from './sections'

const TABS = [
  { key: 'basic', label: '基本信息' },
  { key: 'educations', label: '教育经历' },
  { key: 'works', label: '实习经历' },
  { key: 'projects', label: '项目经历' },
  { key: 'awards', label: '获奖证书' },
  { key: 'skills', label: '专业技能' },
  { key: 'family', label: '家庭信息' },
  { key: 'intention', label: '求职意向' },
  { key: 'selfEval', label: '自我评价' },
  { key: 'answers', label: '开放题库' },
  { key: 'attachments', label: '附件' },
] as const

type TabKey = (typeof TABS)[number]['key']

export default function App() {
  const [profile, setProfile] = useState<Profile>(createEmptyProfile())
  const [tab, setTab] = useState<TabKey>('basic')
  const [dirty, setDirty] = useState(false)
  const [status, setStatus] = useState('')
  const resumeInputRef = useRef<HTMLInputElement>(null)
  const jsonInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    storage.get<Profile>(STORAGE_KEYS.profile).then((saved) => {
      if (saved) setProfile(sanitizeProfile(saved))
    })
  }, [])

  function update(patch: (p: Profile) => Profile) {
    setProfile((p) => {
      const next = patch(p)
      setDirty(true)
      return next
    })
  }

  async function save() {
    await storage.set(STORAGE_KEYS.profile, profile)
    setDirty(false)
    setStatus(`已保存 ${new Date().toLocaleTimeString()}`)
  }

  async function importResume(file: File | undefined) {
    if (!file) return
    setStatus('解析简历中…')
    try {
      const text = await extractTextFromFile(file)
      const draft = parseResumeText(text)
      update((p) => mergeDraft(p, draft))
      setStatus(`已从 ${file.name} 导入草稿,请校对各区块后保存`)
    } catch (err) {
      setStatus(`导入失败:${err instanceof Error ? err.message : String(err)}`)
    } finally {
      if (resumeInputRef.current) resumeInputRef.current.value = ''
    }
  }

  async function exportJson() {
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `apply-flow-profile-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function importJson(file: File | undefined) {
    if (!file) return
    try {
      const parsed = sanitizeProfile(JSON.parse(await file.text()))
      update(() => parsed)
      setStatus(`已导入 ${file.name},记得保存`)
    } catch (err) {
      setStatus(`JSON 导入失败:${err instanceof Error ? err.message : String(err)}`)
    } finally {
      if (jsonInputRef.current) jsonInputRef.current.value = ''
    }
  }

  function resetAll() {
    if (!confirm('确定清空所有档案数据?(保存后不可恢复)')) return
    update(() => createEmptyProfile())
    setStatus('已清空,保存后生效')
  }

  return (
    <div className="page">
      <header className="toolbar">
        <h1>ApplyFlow 档案管理</h1>
        <div className="toolbar-actions">
          <button onClick={save} disabled={!dirty}>
            {dirty ? '保存' : '已保存'}
          </button>
          <button className="ghost" onClick={() => resumeInputRef.current?.click()}>
            导入简历(PDF/DOCX)
          </button>
          <button className="ghost" onClick={exportJson}>
            导出 JSON
          </button>
          <button className="ghost" onClick={() => jsonInputRef.current?.click()}>
            导入 JSON
          </button>
          <button className="ghost danger" onClick={resetAll}>
            清空
          </button>
          <input ref={resumeInputRef} type="file" accept=".pdf,.docx,.txt" hidden onChange={(e) => importResume(e.target.files?.[0])} />
          <input ref={jsonInputRef} type="file" accept=".json" hidden onChange={(e) => importJson(e.target.files?.[0])} />
        </div>
      </header>
      {status && <p className="status">{status}</p>}

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? 'tab active' : 'tab'} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        {tab === 'basic' && <BasicSection value={profile.basic} onChange={(v) => update((p) => ({ ...p, basic: v }))} />}
        {tab === 'educations' && <EducationsSection value={profile.educations} onChange={(v) => update((p) => ({ ...p, educations: v }))} />}
        {tab === 'works' && <WorksSection value={profile.works} onChange={(v) => update((p) => ({ ...p, works: v }))} />}
        {tab === 'projects' && <ProjectsSection value={profile.projects} onChange={(v) => update((p) => ({ ...p, projects: v }))} />}
        {tab === 'awards' && <AwardsSection value={profile.awards} onChange={(v) => update((p) => ({ ...p, awards: v }))} />}
        {tab === 'skills' && <SkillsSection value={profile.skills} onChange={(v) => update((p) => ({ ...p, skills: v }))} />}
        {tab === 'family' && <FamilySection value={profile.family} onChange={(v) => update((p) => ({ ...p, family: v }))} />}
        {tab === 'intention' && <IntentionSection value={profile.intention} onChange={(v) => update((p) => ({ ...p, intention: v }))} />}
        {tab === 'selfEval' && <SelfEvalSection value={profile.selfEvaluation} onChange={(v) => update((p) => ({ ...p, selfEvaluation: v }))} />}
        {tab === 'answers' && <AnswersSection value={profile.answers} onChange={(v) => update((p) => ({ ...p, answers: v }))} />}
        {tab === 'attachments' && <AttachmentsSection value={profile.attachments} onChange={(v) => update((p) => ({ ...p, attachments: v }))} />}
      </main>
    </div>
  )
}
