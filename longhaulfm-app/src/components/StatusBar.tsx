// src/components/StatusBar.tsx
import { useEffect, useState } from 'react'
import { useBroadcastStore } from '@/stores/broadcastStore'
import { useAuthStore } from '@/stores/authStore'
import { LANG_SHORT } from '@/lib/utils'
import { cn } from '@/lib/utils'

const ACTIVE_LANG_BY_HOUR: Record<number, string> = {
  4: 'zu', 5: 'zu', 6: 'zu',
  7: 'en', 8: 'en', 9: 'en',
  10: 'af', 11: 'af', 12: 'af',
  13: 'en', 14: 'en', 15: 'zu',
  16: 'xh', 17: 'xh', 18: 'xh',
  19: 'en', 20: 'en', 21: 'en',
}

export function StatusBar() {
  const [time, setTime] = useState(new Date())
  const { state } = useBroadcastStore()
  const { profile, signOut } = useAuthStore()

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const activeLang = ACTIVE_LANG_BY_HOUR[time.getHours()] ?? 'en'

  return (
    <header
      className="h-12 bg-road border-b-2 border-amber flex items-center justify-between px-4 flex-shrink-0"
      data-tauri-drag-region
    >
      {/* Logo */}
      <div className="flex items-baseline gap-2">
        <span className="font-display text-2xl tracking-wider text-amber">🚛 Long Haul FM</span>
        <span className="font-ui text-2xs tracking-widest text-ink-dim uppercase">KZN · Broadcast Ops</span>
      </div>

      {/* Centre: language indicators */}
      <div className="flex items-center gap-1.5">
        {(['en', 'zu', 'xh', 'af'] as const).map(lang => (
          <span
            key={lang}
            className={cn(
              'font-ui text-2xs font-bold tracking-wider px-2 py-0.5 rounded-sm border transition-colors',
              activeLang === lang
                ? 'border-amber text-amber bg-amber-subtle'
                : 'border-marking text-ink-dim'
            )}
          >
            {LANG_SHORT[lang]}
          </span>
        ))}
      </div>

      {/* Right: on-air, listener count, clock, user */}
      <div className="flex items-center gap-4">
        {/* Listener count */}
        {state && (
          <div className="flex items-center gap-1.5">
            <span className="font-ui text-2xs text-ink-dim uppercase tracking-wider">Live</span>
            <span className="font-display text-lg text-signal-green tracking-wider">
              {state.listener_count.toLocaleString()}
            </span>
          </div>
        )}

        {/* On Air badge */}
        {state?.is_on_air && (
          <div className="on-air-badge">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-blink" />
            ON AIR
          </div>
        )}

        {/* Clock */}
        <span className="font-display text-xl tracking-widest text-amber">
          {time.toLocaleTimeString('en-ZA', { hour12: false })}
        </span>

        {/* User menu */}
        {profile && (
          <button
            onClick={signOut}
            className="font-ui text-2xs text-ink-dim hover:text-ink uppercase tracking-wider transition-colors"
            title="Sign out"
          >
            {profile.display_name.split(' ')[0]} ✕
          </button>
        )}
      </div>
    </header>
  )
}
