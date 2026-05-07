import { useState } from 'react'
import { api } from '../lib/ipc'
import { useWorkspaceStore } from '../stores/workspaceStore'

type LastResult = { mode: 'embedding' | 'keyword'; keywords?: string[]; matched: number } | null

export function SearchBar({ projectId }: { projectId: string }) {
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [last, setLast] = useState<LastResult>(null)
  const setFilters = useWorkspaceStore((s) => s.setFilters)
  const setView = useWorkspaceStore((s) => s.setView)

  async function search() {
    if (!q.trim()) {
      setFilters({ naturalLanguageIds: undefined })
      setLast(null)
      return
    }
    setBusy(true)
    try {
      const r = await api.ai.nlSearch(projectId, q.trim())
      setFilters({ naturalLanguageIds: r.ids })
      setView('grid')
      setLast({ mode: r.mode, keywords: r.keywords, matched: r.matched ?? r.ids.length })
    } finally { setBusy(false) }
  }

  function clear() {
    setQ('')
    setFilters({ naturalLanguageIds: undefined })
    setLast(null)
  }

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
      <input id="search-input" value={q} onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && search()}
        placeholder="自然语言搜图（按 / 聚焦）"
        style={{ width: 260, background: '#0a0a0a', border: '1px solid #333', color: '#ddd', padding: '5px 10px', borderRadius: 5, fontSize: 12 }} />
      <button onClick={search} disabled={busy} style={{ background: '#222', color: '#ddd', border: '1px solid #333', padding: '5px 10px', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>
        {busy ? '搜索中…' : '🔍'}
      </button>
      {last && (
        <span style={{ fontSize: 11, color: '#888' }}>
          {last.mode === 'keyword'
            ? <>关键词 <span style={{ color: '#aaa' }}>[{last.keywords?.join(', ')}]</span> · 命中 {last.matched}</>
            : <>语义匹配 · 命中 {last.matched}</>}
          <button onClick={clear} style={{ marginLeft: 6, background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: 11 }}>清除</button>
        </span>
      )}
    </div>
  )
}
