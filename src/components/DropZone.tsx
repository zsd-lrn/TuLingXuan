import { useState } from 'react'
import { api } from '../lib/ipc'

export function DropZone({ onCreated }: { onCreated: (projectId: string) => void }) {
  const [busy, setBusy] = useState(false)

  async function pick() {
    const dir = await api.shell.pickDirectory()
    if (!dir) return
    setBusy(true)
    try {
      const existing = await api.projects.findBySourceDir(dir)
      if (existing) {
        if (confirm(`该文件夹已是项目"${existing.name}"，是否打开？`)) {
          onCreated(existing.id); return
        }
      }
      const proj = await api.projects.create({ sourceDir: dir })
      onCreated(proj.id)
    } finally { setBusy(false) }
  }

  return (
    <div
      style={{
        border: '2px dashed #444', borderRadius: 12, padding: 64, textAlign: 'center',
        background: busy ? '#1a1a1c' : '#141416', cursor: busy ? 'wait' : 'pointer',
      }}
      onClick={busy ? undefined : pick}
    >
      <div style={{ fontSize: 18, marginBottom: 12 }}>{busy ? '正在导入…' : '点击选择文件夹新建项目'}</div>
      <div style={{ fontSize: 13, color: '#888' }}>支持 jpg / png / webp / avif，文件夹内文件不会被复制</div>
    </div>
  )
}
