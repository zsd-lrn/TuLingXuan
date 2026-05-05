import { useQueries, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { Image } from '@shared/types'
import { api } from '../lib/ipc'
import { useWorkspaceStore } from '../stores/workspaceStore'

export function CompareView({ projectId }: { projectId: string }) {
  const selection = useWorkspaceStore((s) => s.selection)
  const ids = Array.from(selection)
  const qc = useQueryClient()
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [rewriteBusy, setRewriteBusy] = useState(false)
  const [rewrittenPrompts, setRewrittenPrompts] = useState<string[] | null>(null)

  const queries = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['image', id],
      queryFn: () => api.images.get(id),
    })),
  })
  const images = queries.map((q) => q.data).filter(Boolean) as Image[]

  if (images.length < 2) {
    return (
      <div style={{ padding: 24, color: '#888' }}>
        请在网格视图选择 2-4 张图，然后按 <kbd style={kbd}>C</kbd> 进入对比模式。
      </div>
    )
  }

  const cols = images.length === 2 ? 2 : 2
  const rows = Math.ceil(images.length / cols)

  async function askAI() {
    setBusy(true); setAiSummary(null)
    try {
      const r = await api.ai.compare(ids)
      setAiSummary(r.summary)
    } catch (e: any) {
      setAiSummary('AI 评审失败：' + (e?.message ?? e))
    } finally { setBusy(false) }
  }

  async function rewritePrompts() {
    setRewriteBusy(true); setRewrittenPrompts(null)
    try {
      const r = await api.ai.rewritePrompts(ids)
      setRewrittenPrompts(r.prompts)
    } catch (e: any) {
      setRewrittenPrompts(['生成失败：' + (e?.message ?? e)])
    } finally { setRewriteBusy(false) }
  }

  async function copyText(t: string) {
    try { await navigator.clipboard.writeText(t) } catch { /* ignore */ }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #222', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ color: '#888', fontSize: 12 }}>对比 {images.length} 张</span>
        <button onClick={askAI} disabled={busy}
          style={{ background: '#4a90e2', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>
          {busy ? 'AI 思考中…' : '🤖 AI 评审建议'}
        </button>
        <button onClick={rewritePrompts} disabled={rewriteBusy}
          style={{ background: '#222', color: '#ddd', border: '1px solid #333', padding: '5px 12px', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>
          {rewriteBusy ? '生成中…' : '✨ 基于这些图改进 prompt'}
        </button>
        {aiSummary && <span style={{ flex: '1 1 100%', color: '#ddd', fontSize: 12, lineHeight: 1.5 }}>{aiSummary}</span>}
        {rewrittenPrompts && (
          <div style={{ flex: '1 1 100%', display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
            {rewrittenPrompts.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', background: '#0a0a0a', padding: '6px 8px', borderRadius: 4 }}>
                <span style={{ color: '#666', fontSize: 11, marginTop: 1 }}>{i + 1}.</span>
                <span style={{ flex: 1, color: '#ddd', fontSize: 11, fontFamily: 'monospace', lineHeight: 1.5 }}>{p}</span>
                <button onClick={() => copyText(p)} style={{ background: '#222', border: '1px solid #333', color: '#aaa', padding: '2px 8px', borderRadius: 3, cursor: 'pointer', fontSize: 10 }}>复制</button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)`, gap: 4, padding: 4, minHeight: 0 }}>
        {images.map((img) => (
          <div key={img.id} style={{ background: '#0a0a0a', borderRadius: 6, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
              <img src={`tlx-image://${img.id}`} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </div>
            <div style={{ padding: 8, fontSize: 11, borderTop: '1px solid #1a1a1a', display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ color: '#aaa' }}>{img.filename.slice(0, 16)}</span>
              <span style={{ marginLeft: 'auto', color: '#666' }}>Q{Math.round(img.aiQualityScore ?? 0)} A{Math.round(img.aiAestheticScore ?? 0)}</span>
              {(['good', 'maybe', 'bad'] as const).map((s) => (
                <button key={s}
                  onClick={() => api.images.updateDecision({ id: img.id, projectId, status: s }).then(() => qc.invalidateQueries({ queryKey: ['image', img.id] }))}
                  style={{
                    background: img.userStatus === s ? '#2a2a2e' : '#161618', border: '1px solid #333', color: '#ddd',
                    padding: '2px 8px', borderRadius: 3, cursor: 'pointer', fontSize: 11,
                  }}>{s === 'good' ? '好' : s === 'bad' ? '差' : '待'}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const kbd: React.CSSProperties = { background: '#222', padding: '1px 6px', borderRadius: 3, fontSize: 11, fontFamily: 'monospace' }
