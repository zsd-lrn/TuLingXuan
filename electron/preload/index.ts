import { contextBridge, ipcRenderer } from 'electron'

const api = {
  projects: {
    list: () => ipcRenderer.invoke('projects.list'),
    get: (id: string) => ipcRenderer.invoke('projects.get', id),
    create: (input: { sourceDir: string; name?: string }) =>
      ipcRenderer.invoke('projects.create', input),
    delete: (id: string) => ipcRenderer.invoke('projects.delete', id),
    findBySourceDir: (dir: string) => ipcRenderer.invoke('projects.findBySourceDir', dir),
  },
  images: {
    query: (params: any) => ipcRenderer.invoke('images.query', params),
    get: (id: string) => ipcRenderer.invoke('images.get', id),
    updateDecision: (payload: any) => ipcRenderer.invoke('images.updateDecision', payload),
    aggregateTags: (projectId: string) => ipcRenderer.invoke('images.aggregateTags', projectId),
  },
  ai: {
    start: (projectId: string) => ipcRenderer.invoke('ai.start', projectId),
    cancel: (projectId: string) => ipcRenderer.invoke('ai.cancel', projectId),
    suggestPrompt: (imageId: string) => ipcRenderer.invoke('ai.suggestPrompt', imageId),
    compare: (imageIds: string[]) => ipcRenderer.invoke('ai.compare', imageIds),
    nlSearch: (projectId: string, query: string) => ipcRenderer.invoke('ai.nlSearch', { projectId, query }),
    rewritePrompts: (imageIds: string[]) => ipcRenderer.invoke('ai.rewritePrompts', imageIds),
  },
  clustering: {
    compute: (projectId: string) => ipcRenderer.invoke('clustering.compute', projectId),
    list: (projectId: string) => ipcRenderer.invoke('clustering.list', projectId),
  },
  export: {
    run: (payload: any) => ipcRenderer.invoke('export.run', payload),
  },
  settings: {
    get: () => ipcRenderer.invoke('settings.get'),
    set: (s: any) => ipcRenderer.invoke('settings.set', s),
    cacheStats: () => ipcRenderer.invoke('settings.cacheStats'),
    clearCache: () => ipcRenderer.invoke('settings.clearCache'),
    testConnection: (payload: { doubaoKey?: string }) => ipcRenderer.invoke('settings.testConnection', payload),
  },
  events: {
    onAIProgress:       (cb: (e: any) => void) => { ipcRenderer.on('ai:progress', (_, e) => cb(e));        return () => ipcRenderer.removeAllListeners('ai:progress') },
    onAIImageUpdated:   (cb: (e: any) => void) => { ipcRenderer.on('ai:image-updated', (_, e) => cb(e));   return () => ipcRenderer.removeAllListeners('ai:image-updated') },
    onImportProgress:   (cb: (e: any) => void) => { ipcRenderer.on('import:progress', (_, e) => cb(e));    return () => ipcRenderer.removeAllListeners('import:progress') },
  },
  shell: {
    pickDirectory: () => ipcRenderer.invoke('shell.pickDirectory'),
    pickExportTarget: () => ipcRenderer.invoke('shell.pickExportTarget'),
  },
}

contextBridge.exposeInMainWorld('api', api)
export type ElectronAPI = typeof api
