// src/routes/alerts.tsx
import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAlertStore } from '@/stores/alertStore'
import { RoadAlerts } from '@/components/RoadAlertForm'

export const Route = createFileRoute('/alerts')({
  component: AlertsPage,
})

function AlertsPage() {
  const { fetchAlerts } = useAlertStore()
  useEffect(() => { fetchAlerts() }, [fetchAlerts])

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-hidden animate-fade-in">
      <div className="flex-shrink-0">
        <h1 className="font-display text-3xl tracking-wider text-amber">Road Alerts</h1>
        <p className="font-ui text-xs text-ink-dim uppercase tracking-wider mt-0.5">
          KwaZulu-Natal · Live broadcast feed
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <RoadAlerts />
      </div>
    </div>
  )
}
