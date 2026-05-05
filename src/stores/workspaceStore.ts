import { create } from 'zustand'
import type { Tag, UserStatus } from '@shared/types'

export type ViewName = 'grid' | 'cluster' | 'compare' | 'single'

type State = {
  view: ViewName
  selection: Set<string>            // image ids
  focusedImageId: string | null     // keyboard cursor
  filters: {
    status?: (UserStatus | 'undecided')[]
    scoreRange?: [number, number]
    qualityRange?: [number, number]
    aestheticRange?: [number, number]
    tags?: Tag[]
    clusterId?: number | null
    naturalLanguageIds?: string[]
  }
  sort: 'imported' | 'quality' | 'aesthetic' | 'score'

  setView: (v: ViewName) => void
  toggleSelect: (id: string, exclusive?: boolean) => void
  clearSelection: () => void
  setFocused: (id: string | null) => void
  setFilters: (f: Partial<State['filters']>) => void
  resetFilters: () => void
  setSort: (s: State['sort']) => void
}

export const useWorkspaceStore = create<State>((set) => ({
  view: 'grid',
  selection: new Set(),
  focusedImageId: null,
  filters: {},
  sort: 'imported',

  setView: (v) => set({ view: v }),
  toggleSelect: (id, exclusive) =>
    set((s) => {
      const next = exclusive ? new Set<string>() : new Set(s.selection)
      if (next.has(id)) next.delete(id); else next.add(id)
      return { selection: next, focusedImageId: id }
    }),
  clearSelection: () => set({ selection: new Set() }),
  setFocused: (id) => set({ focusedImageId: id }),
  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
  resetFilters: () => set({ filters: {} }),
  setSort: (s) => set({ sort: s }),
}))
