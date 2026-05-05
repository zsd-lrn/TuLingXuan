import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/ipc'
import { useWorkspaceStore, type ViewName } from '../stores/workspaceStore'

export type Command =
  | { type: 'navigate'; dir: 'up' | 'down' | 'left' | 'right' }
  | { type: 'mark'; status: 'good' | 'bad' | 'maybe' | null }
  | { type: 'score'; score: 1 | 2 | 3 | 4 | 5 }
  | { type: 'enter' }
  | { type: 'escape' }
  | { type: 'compare' }
  | { type: 'view'; view: ViewName }
  | { type: 'search-focus' }

export function resolveCommand(e: KeyboardEvent): Command | null {
  const tag = (e.target as HTMLElement | null)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return null

  // Cmd/Ctrl + 1..4 → view switch
  if ((e.metaKey || e.ctrlKey) && /^[1-4]$/.test(e.key)) {
    const map: ViewName[] = ['grid', 'cluster', 'compare', 'single']
    return { type: 'view', view: map[Number(e.key) - 1]! }
  }

  switch (e.key) {
    case 'j': return { type: 'navigate', dir: 'down' }
    case 'k': return { type: 'navigate', dir: 'up' }
    case 'h': return { type: 'navigate', dir: 'left' }
    case 'l': return { type: 'navigate', dir: 'right' }
    case 'f': case 'F': return { type: 'mark', status: 'good' }
    case 'd': case 'D': return { type: 'mark', status: 'bad' }
    case ' ': return { type: 'mark', status: 'maybe' }
    case '0': return { type: 'mark', status: null }
    case '1': return { type: 'score', score: 1 }
    case '2': return { type: 'score', score: 2 }
    case '3': return { type: 'score', score: 3 }
    case '4': return { type: 'score', score: 4 }
    case '5': return { type: 'score', score: 5 }
    case 'Enter': return { type: 'enter' }
    case 'Escape': return { type: 'escape' }
    case 'c': case 'C': return { type: 'compare' }
    case '/': return { type: 'search-focus' }
    default: return null
  }
}

export function useKeyboardCommand(projectId: string, items: { id: string }[]) {
  const queryClient = useQueryClient()
  const focused = useWorkspaceStore((s) => s.focusedImageId)
  const setFocused = useWorkspaceStore((s) => s.setFocused)
  const setView = useWorkspaceStore((s) => s.setView)

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const cmd = resolveCommand(e)
      if (!cmd) return
      e.preventDefault()

      const idx = focused ? items.findIndex((i) => i.id === focused) : -1
      const cur = idx >= 0 ? items[idx] : items[0]

      switch (cmd.type) {
        case 'navigate': {
          const cols = Math.max(2, Math.floor((window.innerWidth - 500) / 168))
          let next = idx
          if (cmd.dir === 'down')  next = idx + cols
          if (cmd.dir === 'up')    next = idx - cols
          if (cmd.dir === 'right') next = idx + 1
          if (cmd.dir === 'left')  next = idx - 1
          if (next < 0) next = 0
          if (next >= items.length) next = items.length - 1
          setFocused(items[next]?.id ?? null)
          break
        }
        case 'mark': {
          if (!cur) return
          api.images.updateDecision({ id: cur.id, projectId, status: cmd.status }).then(() => {
            queryClient.invalidateQueries({ queryKey: ['images'] })
            queryClient.invalidateQueries({ queryKey: ['project', projectId] })
          })
          break
        }
        case 'score': {
          if (!cur) return
          api.images.updateDecision({ id: cur.id, projectId, score: cmd.score }).then(() => {
            queryClient.invalidateQueries({ queryKey: ['images'] })
            queryClient.invalidateQueries({ queryKey: ['project', projectId] })
          })
          break
        }
        case 'view': setView(cmd.view); break
        case 'enter': setView('single'); break
        case 'escape': setView('grid'); break
        case 'compare': {
          const sel = useWorkspaceStore.getState().selection
          if (sel.size >= 2 && sel.size <= 4) setView('compare')
          break
        }
        case 'search-focus': {
          (document.querySelector<HTMLInputElement>('#search-input'))?.focus()
          break
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [focused, items, projectId, queryClient, setFocused, setView])
}
