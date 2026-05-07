import type { Image } from '@shared/types'

const STATUS_COLOR = {
  good: '#22c55e', maybe: '#eab308', bad: '#71717a',
} as const

export function ImageCard({ image, focused, selected, analyzing, onClick }: {
  image: Image; focused: boolean; selected: boolean; analyzing?: boolean
  onClick: (e: React.MouseEvent) => void
}) {
  const dim = image.aiStatus === 'pending' || image.aiStatus === 'running'
  return (
    <div
      onClick={onClick}
      // tlx-analyzing applies shimmer + blue outline; takes precedence over focus/select
      // outlines via !important in the CSS class so the user's eye locks onto activity.
      className={analyzing ? 'tlx-analyzing' : undefined}
      style={{
        position: 'relative',
        background: '#0a0a0a',
        borderRadius: 6,
        overflow: 'hidden',
        outline: focused ? '2px solid #fff' : selected ? '2px solid #4a90e2' : 'none',
        outlineOffset: -2,
        cursor: 'pointer',
        aspectRatio: '1',
        opacity: dim ? 0.7 : 1,
      }}
    >
      <img
        src={`tlx-thumb://${image.hash}`}
        loading="lazy"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      {/* analyzed corner */}
      {image.aiStatus === 'done' && (
        <div style={{
          position: 'absolute', top: 0, right: 0,
          borderTop: '12px solid #4a90e2', borderLeft: '12px solid transparent',
        }} />
      )}
      {/* status corner */}
      {image.userStatus && (
        <div style={{
          position: 'absolute', bottom: 4, right: 4,
          width: 10, height: 10, borderRadius: 999,
          background: STATUS_COLOR[image.userStatus],
        }} />
      )}
      {/* issue badge */}
      {image.tags.some((t) => t.category === 'issue' && t.value !== '无') && (
        <div title="AI 检测到问题" style={{
          position: 'absolute', top: 4, left: 4,
          width: 8, height: 8, borderRadius: 999, background: '#ef4444',
        }} />
      )}
      {/* score */}
      {image.userScore && (
        <div style={{
          position: 'absolute', bottom: 4, left: 4,
          fontSize: 11, color: '#fff', background: 'rgba(0,0,0,0.6)',
          padding: '2px 6px', borderRadius: 999,
        }}>
          ★ {image.userScore}
        </div>
      )}
    </div>
  )
}
