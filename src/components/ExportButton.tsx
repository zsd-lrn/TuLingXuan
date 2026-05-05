import { useState } from 'react'
import { useWorkspaceStore } from '../stores/workspaceStore'
import { api } from '../lib/ipc'

export function ExportButton({ projectId }: { projectId: string }) {
  const selection = useWorkspaceStore((s) => s.selection)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function run() {
    if (selection.size === 0) { setMsg('请先选中要导出的图片'); return }
    const dir = await api.shell.pickExportTarget()
    if (!dir) return
    setBusy(true); setMsg(null)
    try {
      const r = await api.export.run({
        projectId, imageIds: Array.from(selection), targetDir: dir, includeCsv: true,
      })
      setMsg(`已导出 ${r.copied} 张图 + CSV`)
    } catch (e: any) {
      setMsg('导出失败：' + (e?.message ?? e))
    } finally { setBusy(false) }
  }

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={run} disabled={busy}
        style={{ background: '#222', color: '#ddd', border: '1px solid #333', padding: '5px 12px', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>
        ⤓ 导出 {selection.size > 0 ? `(${selection.size})` : ''}
      </button>
      {msg && <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, background: '#222', padding: '6px 10px', borderRadius: 4, fontSize: 11, color: '#aaa', whiteSpace: 'nowrap', zIndex: 10 }}>{msg}</div>}
    </div>
  )
}
