export function WorkspacePage({ projectId, onBack }: { projectId: string; onBack: () => void }) {
  return (
    <div style={{ padding: 24 }}>
      <button onClick={onBack}>← 返回</button>
      <h2 style={{ marginTop: 16 }}>项目：{projectId}</h2>
      <div style={{ color: '#888', marginTop: 8 }}>workspace shell — built in next task</div>
    </div>
  )
}
