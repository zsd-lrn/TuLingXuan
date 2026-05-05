import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { api } from '../lib/ipc'

export function SettingsPage({ onBack }: { onBack: () => void }) {
  const qc = useQueryClient()
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => api.settings.get() })
  const cache = useQuery({ queryKey: ['cacheStats'], queryFn: () => api.settings.cacheStats(), refetchInterval: 5000 })
  const [doubao, setDoubao] = useState('')
  const [zhipu, setZhipu] = useState('')
  const [mock, setMock] = useState(false)

  useEffect(() => {
    if (settings.data) {
      setDoubao(settings.data.doubaoKey)
      setZhipu(settings.data.zhipuKey)
      setMock(settings.data.mockMode)
    }
  }, [settings.data])

  const save = useMutation({
    mutationFn: () => api.settings.set({ doubaoKey: doubao, zhipuKey: zhipu, mockMode: mock }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  })
  const clear = useMutation({
    mutationFn: () => api.settings.clearCache(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cacheStats'] }),
  })

  return (
    <div style={{ padding: 32, maxWidth: 720, margin: '0 auto' }}>
      <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}>← 返回</button>
      <h1 style={{ marginTop: 16, marginBottom: 24 }}>设置</h1>

      <Section title="AI 服务">
        <Row label="豆包 API Key（主要）">
          <input type="password" value={doubao} onChange={(e) => setDoubao(e.target.value)}
            placeholder="sk-..." style={inputStyle} />
        </Row>
        <Row label="智谱 API Key（fallback）">
          <input type="password" value={zhipu} onChange={(e) => setZhipu(e.target.value)}
            placeholder="可选" style={inputStyle} />
        </Row>
        <Row label="MOCK 模式">
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={mock} onChange={(e) => setMock(e.target.checked)} />
            启用（不调真实 API，用桩数据；评审者可无 key 体验）
          </label>
        </Row>
        <button onClick={() => save.mutate()} disabled={save.isPending}
          style={{ background: '#4a90e2', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 5, cursor: 'pointer', marginTop: 8 }}>
          {save.isPending ? '保存中…' : '保存'}
        </button>
        {save.isSuccess && <span style={{ marginLeft: 12, color: '#22c55e', fontSize: 12 }}>已保存</span>}
      </Section>

      <Section title="缓存">
        <div style={{ fontSize: 12, color: '#aaa' }}>
          缩略图：{((cache.data?.thumbnails ?? 0) / 1e6).toFixed(1)} MB ·
          AI 分析缓存：{((cache.data?.aiCache ?? 0) / 1e6).toFixed(1)} MB
        </div>
        <button onClick={() => clear.mutate()} disabled={clear.isPending}
          style={{ background: '#222', color: '#ddd', border: '1px solid #333', padding: '6px 14px', borderRadius: 5, cursor: 'pointer', marginTop: 8 }}>
          {clear.isPending ? '清理中…' : '清理缓存'}
        </button>
      </Section>

      <Section title="快捷键">
        <KbdTable />
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 13, color: '#888', textTransform: 'uppercase', marginBottom: 12 }}>{title}</h2>
      {children}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  )
}

function KbdTable() {
  const rows = [
    ['J / K', '上一张 / 下一张'],
    ['H / L', '左 / 右'],
    ['1 - 5', '评分 1-5 星'],
    ['F / D / Space', '标好 / 差 / 待定'],
    ['0', '清除决策'],
    ['Enter / Esc', '进入 / 退出 单图视图'],
    ['C', '进入对比视图（需选 2-4 张）'],
    ['Cmd/Ctrl + 1/2/3/4', '切到 网格 / 聚类 / 对比 / 单图'],
    ['/', '聚焦搜索框'],
  ]
  return (
    <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k}><td style={{ padding: '4px 16px 4px 0', color: '#aaa' }}>{k}</td><td style={{ padding: '4px 0', color: '#666' }}>{v}</td></tr>
        ))}
      </tbody>
    </table>
  )
}

const inputStyle: React.CSSProperties = { background: '#0a0a0a', border: '1px solid #333', color: '#ddd', padding: '6px 10px', borderRadius: 4, width: '100%', fontSize: 12, fontFamily: 'monospace' }
