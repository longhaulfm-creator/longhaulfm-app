import { useSpotifyStreaming } from '@/hooks/useSpotifyStreaming'
import { useBroadcastStore } from '@/stores/broadcastStore'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

export function StreamController() {
  const { user } = useAuthStore()
  const { deviceId, playLongHaul } = useSpotifyStreaming()
  const { state, toggleOnAir } = useBroadcastStore()

  const isActive = state?.is_on_air

  return (
    <div className="p-6 bg-asphalt/95 backdrop-blur-md flex flex-col gap-4">
      <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-ui">
        <span className="text-ink-dim">Transmitter Status</span>
        <span className={isActive ? "text-signal-green" : "text-amber"}>
          {isActive ? "● Live on Air" : "○ Standby"}
        </span>
      </div>

      {user ? (
        <button
          onClick={async () => {
            if (!isActive) await playLongHaul()
            await toggleOnAir()
          }}
          disabled={!deviceId}
          className={cn(
            "w-full py-4 rounded font-bold uppercase tracking-widest transition-all",
            !deviceId ? "bg-lane text-ink-dim cursor-not-allowed" :
            isActive ? "bg-signal-red/20 text-signal-red border border-signal-red/50" : "bg-amber text-asphalt shadow-glow"
          )}
        >
          {!deviceId ? "Initialising Spotify..." : isActive ? "■ Disconnect Stream" : "▶ Engage LongHaul FM"}
        </button>
      ) : (
        <div className="py-4 border border-lane/50 rounded text-center bg-lane/10">
          <span className="text-xs text-ink-dim uppercase tracking-[0.2em] animate-pulse">
            {isActive ? "Receiving Live Transmission" : "Waiting for Broadcast..."}
          </span>
        </div>
      )}
    </div>
  )
}