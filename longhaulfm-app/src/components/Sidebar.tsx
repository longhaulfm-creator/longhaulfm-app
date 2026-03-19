// src/components/Sidebar.tsx
import { Link, useRouterState } from '@tanstack/react-router'
import { useBroadcastStore } from '@/stores/broadcastStore'
import { cn } from '@/lib/utils'

interface NavItem {
  to:     string
  icon:   string
  label:  string
  badge?: () => number | null
}

const NAV: NavItem[] = [
  { to: '/',          icon: '⬡', label: 'Dashboard' },
  { to: '/schedule',  icon: '◫', label: 'Schedule' },
  { to: '/callers',   icon: '◎', label: 'Callers' },
  { to: '/alerts',    icon: '△', label: 'Road Alerts' },
  { to: '/partner',   icon: '⬛', label: 'Partner' },
]

export function Sidebar() {
  const router = useRouterState()
  const { callers } = useBroadcastStore()
  const currentPath = router.location.pathname

  const waitingCallers = callers.filter(c => c.status === 'waiting').length

  return (
    <aside className="w-14 bg-road border-r border-marking flex flex-col items-center py-3 gap-1 flex-shrink-0">
      {NAV.map(item => {
        const isActive = currentPath === item.to
        const badge = item.to === '/callers' && waitingCallers > 0 ? waitingCallers : null

        return (
          <Link key={item.to} to={item.to}>
            <div
              className={cn(
                'relative w-10 h-10 flex items-center justify-center rounded',
                'font-ui text-base transition-all duration-150 cursor-pointer',
                'hover:bg-lane hover:text-ink',
                isActive
                  ? 'bg-amber-subtle text-amber border border-amber/30'
                  : 'text-ink-dim border border-transparent'
              )}
              title={item.label}
            >
              {item.icon}
              {badge !== null && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-signal-red text-white
                                 font-ui text-2xs flex items-center justify-center">
                  {badge}
                </span>
              )}
            </div>
          </Link>
        )
      })}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Version */}
      <span className="font-mono text-2xs text-ink-ghost rotate-90 tracking-widest">v1.0</span>
    </aside>
  )
}
