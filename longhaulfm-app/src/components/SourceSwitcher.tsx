import { useBroadcastStore } from '@/stores/broadcastStore'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

export function SourceSwitcher() {
  const { user } = useAuthStore()
  const { state, switchSource, fadeDuration, setFadeDuration } = useBroadcastStore()

  // HIDE ENTIRELY FOR LISTENERS
  if (!user) return null;

  const sources = [
    { id: 'spotify', label: 'Spotify', icon: '♫' },
    { id: 'live', label: 'Live Studio', icon: '🎙' },
    { id: 'talk', label: 'Talk / Phones', icon: '📍' },
  ]

  return (
    <div className="flex items-center gap-4 bg-brand-dark p-2 rounded border border-lane">
      {sources.map((src) => (
        <button
          key={src.id}
          onClick={() => switchSource(src.id as any)}
          className={cn(
            "px-4 py-2 rounded text-[10px] font-bold uppercase tracking-tighter transition-all",
            state?.current_source === src.id 
              ? "bg-signal-green text-asphalt shadow-[0_0_10px_rgba(34,197,94,0.4)]" 
              : "bg-lane text-ink-dim hover:text-white"
          )}
        >
          {src.icon} {src.label}
        </button>
      ))}
      <div className="h-4 w-[1px] bg-lane mx-2" />
      <input 
        type="range" min={0} max={10} value={fadeDuration} 
        onChange={(e) => setFadeDuration(Number(e.target.value))}
        className="w-20 accent-amber"
      />
    </div>
  )
}