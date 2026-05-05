import { useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { HomePage } from './pages/HomePage'
import { WorkspacePage } from './pages/WorkspacePage'
import { SettingsPage } from './pages/SettingsPage'
import { StatusBanner } from './components/StatusBanner'

type Route =
  | { name: 'home' }
  | { name: 'workspace'; projectId: string }
  | { name: 'settings' }

export function App() {
  const [route, setRoute] = useState<Route>({ name: 'home' })
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBanner />
      {route.name === 'home' && <HomePage onOpen={(id) => setRoute({ name: 'workspace', projectId: id })} onSettings={() => setRoute({ name: 'settings' })} />}
      {route.name === 'workspace' && <WorkspacePage projectId={route.projectId} onBack={() => setRoute({ name: 'home' })} onSettings={() => setRoute({ name: 'settings' })} />}
      {route.name === 'settings' && <SettingsPage onBack={() => setRoute({ name: 'home' })} />}
    </QueryClientProvider>
  )
}
