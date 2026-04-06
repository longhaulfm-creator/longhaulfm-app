import { useAlertStore } from '@/stores/alertStore'

export function Sidebar() {
  // Use destructuring with default value to be 100% safe
  const { alerts = [], isLoading } = useAlertStore()

  // Guard against non-array values before calling .filter
  const activeAlerts = Array.isArray(alerts) 
    ? alerts.filter(a => a.is_active !== false) 
    : []

  return (
    <aside className="w-64 border-r border-lane bg-asphalt/80 flex flex-col overflow-hidden">
      <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-ui text-[10px] tracking-widest text-ink-dim uppercase">
            Road Alerts ({activeAlerts.length})
          </h2>
          {isLoading && <div className="w-2 h-2 rounded-full bg-amber animate-pulse" />}
        </div>
        
        <div className="flex flex-col gap-3">
          {activeAlerts.length > 0 ? (
            activeAlerts.map((alert) => (
              <div key={alert.id} className="p-3 bg-asphalt border-l-2 border-amber rounded-r shadow-md">
                <div className="text-[10px] font-bold text-amber uppercase">{alert.route}</div>
                <div className="text-[11px] text-ink-dim mt-1 leading-tight">{alert.detail}</div>
              </div>
            ))
          ) : (
            <div className="text-[10px] text-ink-dim italic text-center py-8 opacity-50">
              No active alerts in KZN
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-lane bg-black/20">
        <div className="flex items-center justify-between text-[9px] font-mono">
          <span className="text-ink-dim uppercase">System Status</span>
          <span className="text-signal-green">NOMINAL</span>
        </div>
      </div>
    </aside>
  )
}