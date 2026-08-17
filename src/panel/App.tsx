import { useEffect, useMemo, useState } from 'react'
import { MSG, type FillResult, type ScanResult, type SystemId } from '../shared/messages'
import { storage, STORAGE_KEYS } from '../core/storage'
import { buildMappings, type MappingResult } from '../core/matcher'
import { getByPath, FIELD_LABELS, ITEM_FIELD_LABELS, createEmptyProfile, type Profile } from '../core/profile'
import { sanitizeProfile } from '../core/profile-merge'

type ConnState = 'idle' | 'connecting' | 'connected' | 'no-response'

/** 手动映射记忆:签名 -> fieldId -> 档案路径('' = 跳过) */
type Overrides = Record<string, Record<string, string>>

const SYSTEM_NAMES: Record<SystemId, string> = {
  moka: 'Moka',
  beisen: '北森',
  generic: '通用识别',
}

/** 可选的映射目标(基本字段 + 档案中的条目字段 + 附件) */
function buildPathOptions(profile: Profile): Array<{ path: string; label: string }> {
  const opts = Object.entries(FIELD_LABELS).map(([path, label]) => ({ path, label }))
  for (const [key, fields] of Object.entries(ITEM_FIELD_LABELS)) {
    const items = profile[key as keyof Profile] as unknown as Array<Record<string, unknown>>
    items.forEach((_item, i) => {
      for (const [f, fl] of Object.entries(fields)) {
        opts.push({ path: `${key}.${i}.${f}`, label: `${fl} · 第${i + 1}条` })
      }
    })
  }
  for (const [key, att] of Object.entries(profile.attachments)) {
    opts.push({ path: `attachments.${key}`, label: `附件 · ${att.name || key}` })
  }
  return opts
}

function previewValue(profile: Profile, path: string): string {
  const v = getByPath(profile, path)
  if (v === undefined || v === null) return ''
  if (typeof v === 'string') return v
  if (Array.isArray(v)) return v.join('、')
  if (typeof v === 'object' && 'dataUrl' in (v as object)) return '[附件]'
  return String(v)
}

export default function App() {
  const [conn, setConn] = useState<ConnState>('idle')
  const [profile, setProfile] = useState<Profile>(createEmptyProfile())
  const [scan, setScan] = useState<ScanResult | null>(null)
  const [userPaths, setUserPaths] = useState<Record<string, string>>({}) // 面板内用户改过的映射
  const [fillResult, setFillResult] = useState<FillResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    storage.get<Profile>(STORAGE_KEYS.profile).then((saved) => {
      if (saved) setProfile(sanitizeProfile(saved))
    })
  }, [])

  const pathOptions = useMemo(() => buildPathOptions(profile), [profile])

  /** 规则映射 + 手动覆盖(面板内 + 持久化 overrides) */
  const [persistedOverrides, setPersistedOverrides] = useState<Overrides>({})
  const mappings: MappingResult[] = useMemo(() => {
    if (!scan) return []
    const scoped = { ...(persistedOverrides[scan.signature] ?? {}), ...userPaths }
    return buildMappings(scan.fields, scoped)
  }, [scan, persistedOverrides, userPaths])

  async function getActiveTabId(): Promise<number> {
    const res = await chrome.runtime.sendMessage({ type: MSG.GET_ACTIVE_TAB })
    const tab = res?.tab as chrome.tabs.Tab | null
    if (!tab?.id) throw new Error('找不到活动标签页')
    return tab.id
  }

  async function ping() {
    setConn('connecting')
    try {
      const id = await getActiveTabId()
      const res = await chrome.tabs.sendMessage(id, { type: MSG.PING })
      setConn(res?.ok ? 'connected' : 'no-response')
    } catch {
      setConn('no-response')
    }
  }

  async function handleScan() {
    setError('')
    setFillResult(null)
    setBusy(true)
    try {
      const id = await getActiveTabId()
      const res = await chrome.tabs.sendMessage(id, { type: MSG.SCAN })
      if (!res?.ok) throw new Error(res?.error ?? '扫描失败')
      setScan(res.result as ScanResult)
      setUserPaths({})
      setConn('connected')
      const overrides = (await storage.get<Overrides>(STORAGE_KEYS.overrides)) ?? {}
      setPersistedOverrides(overrides)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  function setUserPath(fieldId: string, path: string) {
    setUserPaths((prev) => ({ ...prev, [fieldId]: path }))
  }

  async function handleFill() {
    if (!scan) return
    setError('')
    setBusy(true)
    try {
      const instructions = mappings
        .filter((m) => m.path)
        .map((m) => ({ fieldId: m.fieldId, path: m.path as string }))
      const id = await getActiveTabId()
      const res = await chrome.tabs.sendMessage(id, { type: MSG.FILL, instructions })
      if (!res?.ok) throw new Error(res?.error ?? '填充失败')
      setFillResult(res.result as FillResult)

      // 持久化用户本次改过的映射
      if (Object.keys(userPaths).length > 0) {
        const overrides = ((await storage.get<Overrides>(STORAGE_KEYS.overrides)) ?? {})
        overrides[scan.signature] = { ...(overrides[scan.signature] ?? {}), ...userPaths }
        await storage.set(STORAGE_KEYS.overrides, overrides)
        setPersistedOverrides(overrides)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const mapped = mappings.filter((m) => m.path).length
  const unmapped = mappings.length - mapped
  const filled = fillResult?.outcomes.filter((o) => o.status === 'filled').length ?? 0
  const failed = fillResult?.outcomes.filter((o) => o.status === 'failed') ?? []
  const skipped = fillResult?.outcomes.filter((o) => o.status === 'skipped') ?? []

  return (
    <div className="panel">
      <header className="header">
        <h1>ApplyFlow 网申填写</h1>
        <p className="sub">只填不交 · 人工核对后自行提交</p>
      </header>

      <section className="card">
        <button onClick={ping}>连接页面</button>
        <button onClick={handleScan} disabled={busy || conn !== 'connected'}>
          {busy ? '处理中…' : '扫描表单'}
        </button>
        <p className="meta">
          {conn === 'idle' && '先连接当前网申页面'}
          {conn === 'connecting' && '连接中…'}
          {conn === 'connected' && !scan && '已连接,点击扫描'}
          {conn === 'no-response' && '无响应,刷新页面后重试'}
          {scan && (
            <>
              {SYSTEM_NAMES[scan.system]} · {scan.fields.length} 个字段 · 已映射 {mapped}
              {unmapped > 0 && <span className="warn"> · 未映射 {unmapped}</span>}
            </>
          )}
        </p>
        {error && <p className="error">{error}</p>}
        {profile.basic.name === '' && (
          <p className="warn">档案为空,请先到「管理档案」页完善(右键插件图标)</p>
        )}
      </section>

      {scan && (
        <>
          <section className="card">
            <button className="primary" onClick={handleFill} disabled={busy}>
              一键填充
            </button>
            {fillResult && (
              <div className="report">
                <p>
                  ✓ 已填 {filled} · ✗ 失败 {failed.length} · — 跳过 {skipped.length}
                </p>
                {failed.map((o) => (
                  <p key={o.fieldId} className="error">
                    ✗ {o.label}:{o.message}
                  </p>
                ))}
                {skipped.length > 0 && (
                  <details>
                    <summary>跳过明细(档案值为空等)</summary>
                    {skipped.map((o) => (
                      <p key={o.fieldId} className="meta">
                        — {o.label}:{o.message}
                      </p>
                    ))}
                  </details>
                )}
              </div>
            )}
          </section>

          <section className="card fields">
            <p className="meta">字段映射(下拉可手动指定,未映射的填一次后自动记忆)</p>
            {scan.fields.map((field) => {
              const m = mappings.find((x) => x.fieldId === field.fieldId)!
              const value = m.path ? previewValue(profile, m.path) : ''
              const rep = field.repeaterId && field.rowIndex !== undefined ? ` [${field.repeaterId}#${field.rowIndex + 1}]` : ''
              return (
                <div key={field.fieldId} className="field-row">
                  <span className="field-label" title={`${field.label}(${field.kind})`}>
                    {field.label}
                    {field.required && <b className="req">*</b>}
                    {rep && <i className="rep">{rep}</i>}
                  </span>
                  <select value={m.path ?? ''} onChange={(e) => setUserPath(field.fieldId, e.target.value)}>
                    <option value="">— 不填 —</option>
                    {pathOptions.map((o) => (
                      <option key={o.path} value={o.path}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {value && <span className="field-value" title={value}>{value}</span>}
                  {!m.path && field.label && <span className="warn">未映射</span>}
                </div>
              )
            })}
          </section>
        </>
      )}
    </div>
  )
}
