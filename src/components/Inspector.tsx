import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Image } from '@shared/types'
import { api } from '../lib/ipc'
import { useWorkspaceStore } from '../stores/workspaceStore'

export function Inspector({ projectId }: { projectId: string }) {
  const focused = useWorkspaceStore((s) => s.focusedImageId)
  const qc = useQueryClient()
  const img = useQuery<Image | null>({
    queryKey: ['image', focused],
    queryFn: () => (focused ? api.images.get(focused) : Promise.resolve(null)),
    enabled: !!focused,
  })

  if (!focused || !img.data) {
    return <div style={{ padding: 16, color: '#666', fontSize: 12 }}>选中一张图查看详情</div>
  }
  const i = img.data

  async function copyPrompt() {
    if (i.aiPromptGuess) {
      await navigator.clipboard.writeText(i.aiPromptGuess)
    }
  }

  return (
    <div style={{ padding: 12, fontSize: 12 }}>
      <img src={`tlx-thumb://${i.hash}`} style={{ width: '100%', borderRadius: 6 }} />
      <div style={{ color: '#888', marginTop: 8 }}>{i.filename}</div>

      <Section title="AI 评分">
        {i.aiStatus === 'done' ? (
          <>
            <Bar label="技术质量" value={i.aiQualityScore ?? 0} />
            <Bar label="美学" value={i.aiAestheticScore ?? 0} />
          </>
        ) : i.aiStatus === 'error' ? (
          <span style={{ color: '#f87171' }}>分析失败：{i.aiError}</span>
        ) : (
          <span style={{ color: '#666' }}>分析中…</span>
        )}
      </Section>

      {i.aiCaption && (
        <Section title="AI 描述">
          <div>{i.aiCaption}</div>
        </Section>
      )}

      {i.tags.length > 0 && (
        <Section title="AI 标签">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {i.tags.map((t, idx) => (
              <span
                key={idx}
                style={{ background: '#222', padding: '2px 8px', borderRadius: 999, fontSize: 11 }}
              >
                {t.category}: {t.value}
              </span>
            ))}
          </div>
        </Section>
      )}

      {i.aiPromptGuess && (
        <Section title="反推 Prompt">
          <div
            style={{
              background: '#0a0a0a',
              padding: 8,
              borderRadius: 4,
              fontFamily: 'monospace',
              fontSize: 11,
            }}
          >
            {i.aiPromptGuess}
          </div>
          <button
            onClick={copyPrompt}
            style={{
              marginTop: 6,
              background: '#222',
              border: '1px solid #333',
              color: '#ddd',
              padding: '4px 10px',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            复制
          </button>
        </Section>
      )}

      <Section title="决策">
        <div style={{ display: 'flex', gap: 6 }}>
          {(['good', 'maybe', 'bad'] as const).map((s) => (
            <button
              key={s}
              onClick={() =>
                api.images
                  .updateDecision({ id: i.id, projectId, status: s })
                  .then(() => qc.invalidateQueries({ queryKey: ['images'] }))
              }
              style={{
                flex: 1,
                background: i.userStatus === s ? '#2a2a2e' : '#161618',
                border: '1px solid #333',
                color: '#ddd',
                padding: '6px 0',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              {s === 'good' ? '好' : s === 'bad' ? '差' : '待定'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onClick={() =>
                api.images
                  .updateDecision({ id: i.id, projectId, score: s })
                  .then(() => qc.invalidateQueries({ queryKey: ['images'] }))
              }
              style={{
                flex: 1,
                background: i.userScore && i.userScore >= s ? '#eab308' : '#161618',
                border: '1px solid #333',
                color: i.userScore && i.userScore >= s ? '#000' : '#666',
                padding: '6px 0',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              ★
            </button>
          ))}
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div
        style={{ color: '#888', marginBottom: 6, fontSize: 11, textTransform: 'uppercase' }}
      >
        {title}
      </div>
      {children}
    </div>
  )
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#aaa' }}>
        <span>{label}</span>
        <span>{Math.round(value)}</span>
      </div>
      <div style={{ height: 4, background: '#222', borderRadius: 2, overflow: 'hidden' }}>
        <div
          style={{
            width: `${value}%`,
            height: '100%',
            background: value > 70 ? '#22c55e' : value > 40 ? '#eab308' : '#71717a',
          }}
        />
      </div>
    </div>
  )
}
