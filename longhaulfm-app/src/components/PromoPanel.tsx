// src/components/PromoPanel.tsx
// Shows active ad campaigns, countdown to next break, queue promo to AzuraCast

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { fmtZAR, fmtDuration } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Button, Empty, Spinner } from '@/components/ui'
import type { AdCampaign } from '@/types'

const SLOT_ICONS: Record<string, string> = {
  pre_roll:             '▶',
  mid_roll:             '⏸',
  sponsor_read:         '🎙',
  road_report_sponsor:  '🛣',
}

const SLOT_LABEL: Record<string, string> = {
  pre_roll:             'Pre-Roll',
  mid_roll:             'Mid-Roll',
  sponsor_read:         'Sponsor Read',
  road_report_sponsor:  'Road Sponsor',
}

function useActiveCampaigns() {
  return useQuery<AdCampaign[]>({
    queryKey: ['active-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_campaigns')
        .select('*, advertiser:advertisers(company_name)')
        .eq('status', 'active')
        .order('start_date')
      if (error) throw error
      return data as AdCampaign[]
    },
    refetchInterval: 30_000,
  })
}

async function queuePromo(campaignId: string) {
  // Calls AzuraCast via the NextJS API proxy
  const res = await fetch(`${import.meta.env.VITE_SITE_URL}/api/azuracast/control`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'queue_promo', campaign_id: campaignId }),
  })
  if (!res.ok) throw new Error('Failed to queue promo')
}

// Countdown timer to next :00 or :30 (typical break points)
function useNextBreakCountdown() {
  const [secs, setSecs] = useState(0)
  useEffect(() => {
    function compute() {
      const now = new Date()
      const nextBreak = new Date(now)
      if (now.getMinutes() < 30) {
        nextBreak.setMinutes(30, 0, 0)
      } else {
        nextBreak.setHours(now.getHours() + 1, 0, 0, 0)
      }
      setSecs(Math.max(0, Math.floor((nextBreak.getTime() - now.getTime()) / 1000)))
    }
    compute()
    const t = setInterval(compute, 1000)
    return () => clearInterval(t)
  }, [])
  return secs
}

export function PromoPanel() {
  const { data: campaigns = [], isLoading } = useActiveCampaigns()
  const countdown = useNextBreakCountdown()
  const [queueing, setQueueing] = useState<string | null>(null)

  const handleQueue = async (id: string) => {
    setQueueing(id)
    try {
      await queuePromo(id)
    } catch (e) {
      console.error(e)
    } finally {
      setQueueing(null)
    }
  }

  return (
    <div className="panel flex flex-col h-full">
      <div className="panel-header">
        <span className="panel-title">Ad Campaigns</span>
        <div className="flex items-center gap-2">
          <span className="font-ui text-2xs text-ink-dim uppercase tracking-wider">Next break</span>
          <span className="font-display text-base text-amber tracking-wider">
            {fmtDuration(countdown)}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
        {isLoading && <div className="flex justify-center py-4"><Spinner /></div>}
        {!isLoading && campaigns.length === 0 && (
          <Empty message="No active campaigns" />
        )}

        {campaigns.map(c => {
          const progress = c.spots_booked > 0
            ? Math.round((c.spots_played / c.spots_booked) * 100)
            : 0

          return (
            <div key={c.id} className="bg-lane rounded border border-marking p-2.5 flex flex-col gap-2">
              {/* Header row */}
              <div className="flex items-start gap-2">
                <span className="text-base flex-shrink-0" title={SLOT_LABEL[c.slot_type]}>
                  {SLOT_ICONS[c.slot_type]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-ui text-sm font-semibold text-ink leading-tight truncate">{c.name}</p>
                  <p className="font-body text-2xs text-ink-dim truncate">
                    {c.advertiser?.company_name} · {SLOT_LABEL[c.slot_type]}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  loading={queueing === c.id}
                  disabled={c.slot_type === 'sponsor_read'} // reads are manual
                  onClick={() => handleQueue(c.id)}
                  title={c.slot_type === 'sponsor_read' ? 'Live read — see script' : 'Queue in AzuraCast'}
                >
                  {c.slot_type === 'sponsor_read' ? 'Script' : 'Queue'}
                </Button>
              </div>

              {/* Script text for sponsor reads */}
              {c.slot_type === 'sponsor_read' && c.script_text && (
                <div className="bg-road rounded p-2 border border-marking">
                  <p className="font-body text-xs text-ink-muted leading-relaxed" data-selectable>
                    {c.script_text}
                  </p>
                </div>
              )}

              {/* Progress bar */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-0.5 bg-marking rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      progress >= 90 ? 'bg-signal-red' : 'bg-amber'
                    )}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="font-mono text-2xs text-ink-dim w-24 text-right flex-shrink-0">
                  {c.spots_played}/{c.spots_booked} spots
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
