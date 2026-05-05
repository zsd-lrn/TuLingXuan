import { useWorkspaceStore } from '../stores/workspaceStore'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/ipc'
import type { Tag, TagCategory, UserStatus } from '@shared/types'

type StatusFilter = UserStatus | 'undecided'

export function FilterSidebar({ projectId }: { projectId: string }) {
  const filters = useWorkspaceStore((s) => s.filters)
  const setFilters = useWorkspaceStore((s) => s.setFilters)
  const reset = useWorkspaceStore((s) => s.resetFilters)

  return (
    <div style={{ padding: 12, fontSize: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h3 style={{ fontSize: 12, color: '#aaa', textTransform: 'uppercase' }}>筛选</h3>
        <button onClick={reset} style={resetBtn}>清空</button>
      </div>

      <Section title="状态">
        {(['good', 'maybe', 'bad', 'undecided'] as const).map((s) => (
          <Check
            key={s}
            label={labelFor(s)}
            checked={!!filters.status?.includes(s)}
            onToggle={() => {
              const cur = new Set<StatusFilter>(filters.status ?? [])
              if (cur.has(s)) cur.delete(s)
              else cur.add(s)
              setFilters({ status: Array.from(cur) })
            }}
          />
        ))}
      </Section>

      <Section title="评分">
        <div style={{ display: 'flex', gap: 4 }}>
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onClick={() => setFilters({ scoreRange: [s, 5] })}
              style={{
                flex: 1,
                padding: 4,
                borderRadius: 3,
                background: (filters.scoreRange?.[0] ?? 0) >= s ? '#eab308' : '#1a1a1c',
                color: (filters.scoreRange?.[0] ?? 0) >= s ? '#000' : '#888',
                border: '1px solid #333',
                cursor: 'pointer',
                fontSize: 11,
              }}
            >
              ≥{s}
            </button>
          ))}
        </div>
        <button
          onClick={() => setFilters({ scoreRange: undefined })}
          style={{ ...resetBtn, marginTop: 4 }}
        >
          清除评分过滤
        </button>
      </Section>

      <RangeSection
        title="AI 质量分"
        value={filters.qualityRange ?? [0, 100]}
        onChange={(v) => setFilters({ qualityRange: v })}
        onClear={() => setFilters({ qualityRange: undefined })}
        active={!!filters.qualityRange}
      />

      <RangeSection
        title="AI 美学分"
        value={filters.aestheticRange ?? [0, 100]}
        onChange={(v) => setFilters({ aestheticRange: v })}
        onClear={() => setFilters({ aestheticRange: undefined })}
        active={!!filters.aestheticRange}
      />

      <TagFacet projectId={projectId} />
    </div>
  )
}

function labelFor(s: StatusFilter) {
  if (s === null) return '未决策'
  return ({ good: '好', maybe: '待定', bad: '差', undecided: '未决策' } as const)[s]
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ color: '#666', fontSize: 11, marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  )
}

function Check({
  label,
  checked,
  onToggle,
}: {
  label: string
  checked: boolean
  onToggle: () => void
}) {
  return (
    <label
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', cursor: 'pointer' }}
    >
      <input type="checkbox" checked={checked} onChange={onToggle} />
      {label}
    </label>
  )
}

function RangeSection({
  title,
  value,
  onChange,
  onClear,
  active,
}: {
  title: string
  value: [number, number]
  onChange: (v: [number, number]) => void
  onClear: () => void
  active: boolean
}) {
  return (
    <Section title={title}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          type="range"
          min={0}
          max={100}
          value={value[0]}
          onChange={(e) => onChange([Number(e.target.value), value[1]])}
          style={{ flex: 1 }}
        />
        <span style={{ fontSize: 11, color: '#aaa', width: 36 }}>
          {value[0]}-{value[1]}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value[1]}
        onChange={(e) => onChange([value[0], Number(e.target.value)])}
        style={{ width: '100%' }}
      />
      {active && (
        <button onClick={onClear} style={resetBtn}>
          清除
        </button>
      )}
    </Section>
  )
}

function TagFacet({ projectId }: { projectId: string }) {
  const tags = useQuery<{ category: string; value: string; count: number }[]>({
    queryKey: ['tags', projectId],
    queryFn: () => api.images.aggregateTags(projectId),
    refetchInterval: 3000,
  })
  const filters = useWorkspaceStore((s) => s.filters)
  const setFilters = useWorkspaceStore((s) => s.setFilters)

  if (!tags.data?.length) return null

  const grouped = new Map<string, { value: string; count: number }[]>()
  for (const t of tags.data) {
    const arr = grouped.get(t.category) ?? []
    arr.push({ value: t.value, count: t.count })
    grouped.set(t.category, arr)
  }

  function toggle(cat: string, val: string) {
    const cur = filters.tags ?? []
    const idx = cur.findIndex((t) => t.category === cat && t.value === val)
    const next: Tag[] =
      idx >= 0 ? cur.filter((_, i) => i !== idx) : [...cur, { category: cat as TagCategory, value: val }]
    setFilters({ tags: next })
  }

  return (
    <>
      {Array.from(grouped.entries()).map(([cat, vals]) => (
        <Section key={cat} title={catLabel(cat)}>
          {vals.slice(0, 10).map((v) => {
            const active = filters.tags?.some((t) => t.category === cat && t.value === v.value)
            return (
              <div
                key={v.value}
                onClick={() => toggle(cat, v.value)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '3px 6px',
                  background: active ? '#2a2a2e' : 'transparent',
                  borderRadius: 3,
                  cursor: 'pointer',
                }}
              >
                <span>{v.value}</span>
                <span style={{ color: '#666' }}>{v.count}</span>
              </div>
            )
          })}
        </Section>
      ))}
    </>
  )
}

function catLabel(c: string) {
  const map: Record<string, string> = {
    style: '风格',
    subject: '主体',
    mood: '情绪',
    palette: '配色',
    issue: '问题',
  }
  return map[c] ?? c
}

const resetBtn: React.CSSProperties = {
  background: 'transparent',
  color: '#666',
  border: 'none',
  cursor: 'pointer',
  fontSize: 10,
  padding: '2px 0',
}
