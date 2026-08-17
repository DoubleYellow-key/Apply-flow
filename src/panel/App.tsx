import { useState } from 'react'
import { MSG, type ScanResult } from '../shared/messages'

type ConnState = 'idle' | 'connecting' | 'connected' | 'no-response'

export default function App() {
  const [conn, setConn] = useState<ConnState>('idle')
  const [scan, setScan] = useState<ScanResult | null>(null)

  async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
    const res = await chrome.runtime.sendMessage({ type: MSG.GET_ACTIVE_TAB })
    return (res?.tab as chrome.tabs.Tab) ?? null
  }

  async function ping() {
    setConn('connecting')
    try {
      const tab = await getActiveTab()
      if (!tab?.id) throw new Error('找不到活动标签页')
      const res = await chrome.tabs.sendMessage(tab.id, { type: MSG.PING })
      setConn(res?.ok ? 'connected' : 'no-response')
    } catch {
      setConn('no-response')
    }
  }

  async function handleScan() {
    try {
      const tab = await getActiveTab()
      if (!tab?.id) throw new Error('找不到活动标签页')
      const res = await chrome.tabs.sendMessage(tab.id, { type: MSG.SCAN })
      if (res?.ok) setScan(res.result as ScanResult)
    } catch (err) {
      console.error('扫描失败:', err)
    }
  }

  return (
    <div className="panel">
      <header className="header">
        <h1>ApplyFlow 网申填写</h1>
        <p className="sub">只填不交 · 人工核对后提交</p>
      </header>

      <section className="card">
        <button onClick={ping}>连接当前页面</button>
        <p>
          状态:
          {conn === 'idle' && ' 未连接'}
          {conn === 'connecting' && ' 连接中…'}
          {conn === 'connected' && ' 已连接 ✓'}
          {conn === 'no-response' && ' 无响应(刷新页面后重试)'}
        </p>
      </section>

      <section className="card">
        <button onClick={handleScan} disabled={conn !== 'connected'}>
          扫描表单
        </button>
        {scan && (
          <p>
            系统:{scan.system} · 字段数:{scan.fields.length}
          </p>
        )}
      </section>
    </div>
  )
}
