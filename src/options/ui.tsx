// 表单原语组件:档案编辑器各区块共用

import type { ChangeEvent, ReactNode } from 'react'

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="row">
      <span className="row-label">{label}</span>
      <span className="row-control">{children}</span>
    </label>
  )
}

export function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <Row label={label}>
      <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </Row>
  )
}

export function DateInput({
  label,
  value,
  onChange,
  kind = 'month',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  kind?: 'month' | 'date'
}) {
  return (
    <Row label={label}>
      <input
        type={kind === 'month' ? 'month' : 'date'}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      />
    </Row>
  )
}

export function SelectInput({
  label,
  value,
  options,
  onChange,
  allowEmpty = true,
}: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
  allowEmpty?: boolean
}) {
  return (
    <Row label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {allowEmpty && <option value="">请选择</option>}
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </Row>
  )
}

export function TextareaInput({
  label,
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  rows?: number
  placeholder?: string
}) {
  return (
    <Row label={label}>
      <textarea rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </Row>
  )
}

export function Section({
  title,
  hint,
  onAdd,
  addLabel = '添加一条',
  children,
}: {
  title: string
  hint?: string
  onAdd?: () => void
  addLabel?: string
  children: ReactNode
}) {
  return (
    <section className="section">
      <div className="section-head">
        <h2>{title}</h2>
        {hint && <span className="hint">{hint}</span>}
        {onAdd && (
          <button className="ghost" onClick={onAdd}>
            + {addLabel}
          </button>
        )}
      </div>
      {children}
    </section>
  )
}

export function ItemCard({
  index,
  onRemove,
  children,
}: {
  index: number
  onRemove: () => void
  children: ReactNode
}) {
  return (
    <div className="item-card">
      <div className="item-head">
        <span>第 {index + 1} 条</span>
        <button className="danger ghost" onClick={onRemove}>
          删除
        </button>
      </div>
      {children}
    </div>
  )
}
