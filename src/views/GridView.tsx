import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Image } from '@shared/types'
import { useImageQuery } from '../hooks/useImageQuery'
import { useWorkspaceStore } from '../stores/workspaceStore'
import { ImageCard } from '../components/ImageCard'

const COL_MIN_WIDTH = 160

export function GridView({ projectId }: { projectId: string }) {
  const { data } = useImageQuery(projectId)
  const items: Image[] = data?.items ?? []
  const containerRef = useRef<HTMLDivElement>(null)
  const focused = useWorkspaceStore((s) => s.focusedImageId)
  const selection = useWorkspaceStore((s) => s.selection)
  const toggleSelect = useWorkspaceStore((s) => s.toggleSelect)

  const cols = (() => {
    const w = containerRef.current?.clientWidth ?? 1200
    return Math.max(2, Math.floor(w / COL_MIN_WIDTH))
  })()
  const rows = Math.ceil(items.length / cols)

  const rowVirt = useVirtualizer({
    count: rows,
    getScrollElement: () => containerRef.current,
    estimateSize: () => COL_MIN_WIDTH + 8,
    overscan: 4,
  })

  return (
    <div ref={containerRef} style={{ height: '100%', overflow: 'auto', padding: 8 }}>
      <div style={{ height: rowVirt.getTotalSize(), position: 'relative' }}>
        {rowVirt.getVirtualItems().map((vRow) => {
          const start = vRow.index * cols
          const end = Math.min(start + cols, items.length)
          return (
            <div key={vRow.index} style={{
              position: 'absolute', top: vRow.start, left: 0, right: 0,
              display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8, padding: '0 8px',
            }}>
              {items.slice(start, end).map((img: Image) => (
                <ImageCard
                  key={img.id} image={img}
                  focused={focused === img.id}
                  selected={selection.has(img.id)}
                  onClick={(e) => toggleSelect(img.id, !(e.metaKey || e.ctrlKey || e.shiftKey))}
                />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
