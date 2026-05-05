// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { resolveCommand } from '@/hooks/useKeyboardCommand'

describe('resolveCommand', () => {
  it('maps single keys', () => {
    expect(resolveCommand({ key: 'j' } as any)).toEqual({ type: 'navigate', dir: 'down' })
    expect(resolveCommand({ key: 'k' } as any)).toEqual({ type: 'navigate', dir: 'up' })
    expect(resolveCommand({ key: 'h' } as any)).toEqual({ type: 'navigate', dir: 'left' })
    expect(resolveCommand({ key: 'l' } as any)).toEqual({ type: 'navigate', dir: 'right' })
    expect(resolveCommand({ key: 'f' } as any)).toEqual({ type: 'mark', status: 'good' })
    expect(resolveCommand({ key: 'd' } as any)).toEqual({ type: 'mark', status: 'bad' })
    expect(resolveCommand({ key: ' ' } as any)).toEqual({ type: 'mark', status: 'maybe' })
    expect(resolveCommand({ key: '0' } as any)).toEqual({ type: 'mark', status: null })
    expect(resolveCommand({ key: '1' } as any)).toEqual({ type: 'score', score: 1 })
    expect(resolveCommand({ key: '5' } as any)).toEqual({ type: 'score', score: 5 })
  })

  it('ignores keys when target is input', () => {
    const ev = { key: 'f', target: { tagName: 'INPUT' } } as any
    expect(resolveCommand(ev)).toBeNull()
  })

  it('handles view switch keys', () => {
    expect(resolveCommand({ key: '!' , shiftKey: true } as any)).toBeNull()
    // We use Cmd/Ctrl+1..4 for view switch to avoid conflict with score keys
    expect(resolveCommand({ key: '1', metaKey: true } as any)).toEqual({ type: 'view', view: 'grid' })
    expect(resolveCommand({ key: '2', ctrlKey: true } as any)).toEqual({ type: 'view', view: 'cluster' })
  })
})
