// src/components/PartnerPanel.tsx
import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { fmtZAR, fmtRelative } from '@/lib/utils'
import { Button, Spinner, Empty } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { PartnerLocation } from '@/types'

const SERVICE_ICONS: Record<string, string> = {
  truck_wash:   '🚿',
  convenience:  '🏪',
  parking:      '🅿',
  fuel:         '⛽',
  restaurant:   '🍽',
  workshop:     '🔧',
}

function usePartnerLocations() {
  return useQuery<PartnerLocation[]>({
    queryKey: ['partner-locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_locations')
        .select('*')
        .order('name')
      if (error) throw error
      return data as PartnerLocation[]
    },
  })
}

function LocationEditor({ loc }: { loc: PartnerLocation }) {
  const qc = useQueryClient()
  const [bays,    setBays]    = useState(String(loc.bays_available ?? ''))
  const [fuel,    setFuel]    = useState(String(loc.fuel_price_zar ?? ''))
  const [special, setSpecial] = useState(loc.todays_special ?? '')
  const [dirty,   setDirty]   = useState(false)

  // Track dirty state
  useEffect(() => {
    const changed =
      String(loc.bays_available ?? '') !== bays ||
      String(loc.fuel_price_zar  ?? '') !== fuel ||
      (loc.todays_special ?? '')        !== special
    setDirty(changed)
  }, [bays, fuel, special, loc])

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('partner_locations')
        .update({
          bays_available: bays ? Number(bays) : null,
          fuel_price_zar: fuel ? Number(fuel) : null,
          todays_special: special || null,
          updated_at:     new Date().toISOString(),
        })
        .eq('id', loc.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['partner-locations'] })
      setDirty(false)
    },
  })

  return (
    <div className="bg-lane rounded border border-marking p-3 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-ui text-sm font-bold text-ink">{loc.name}</p>
          {loc.route && (
            <p className="font-body text-2xs text-ink-dim mt-0.5">{loc.route}</p>
          )}
        </div>
        <div className="flex gap-1 flex-wrap justify-end">
          {(loc.services ?? []).map(s => (
            <span key={s} title={s} className="text-base">{SERVICE_ICONS[s] ?? '●'}</span>
          ))}
        </div>
      </div>

      {/* Editable fields */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="font-ui text-2xs font-bold tracking-widest uppercase text-ink-muted">
            Bays Available
          </label>
          <input
            className="input"
            type="number"
            min={0}
            placeholder="e.g. 12"
            value={bays}
            onChange={e => setBays(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-ui text-2xs font-bold tracking-widest uppercase text-ink-muted">
            Diesel (R/L)
          </label>
          <input
            className="input"
            type="number"
            step="0.01"
            placeholder="e.g. 23.45"
            value={fuel}
            onChange={e => setFuel(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="font-ui text-2xs font-bold tracking-widest uppercase text-ink-muted">
          Today's Special
        </label>
        <textarea
          className="input resize-none"
          rows={2}
          placeholder="e.g. Full wash + cab vacuum R180 — first 10 rigs only"
          value={special}
          onChange={e => setSpecial(e.target.value)}
          data-selectable
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-body text-2xs text-ink-dim">
          Updated {fmtRelative(loc.updated_at)}
        </span>
        <Button
          variant="primary"
          size="sm"
          disabled={!dirty}
          loading={save.isPending}
          onClick={() => save.mutate()}
        >
          {dirty ? 'Save & Broadcast' : 'Up to date ✓'}
        </Button>
      </div>

      {save.isError && (
        <p className="text-2xs text-signal-red">Failed to save — try again.</p>
      )}
    </div>
  )
}

export function PartnerPanel() {
  const { data: locations = [], isLoading } = usePartnerLocations()

  return (
    <div className="panel flex flex-col h-full">
      <div className="panel-header">
        <span className="panel-title">Partner Locations</span>
        <span className="font-ui text-2xs text-ink-dim">
          Updates broadcast to listeners in real time
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
        {isLoading && <div className="flex justify-center py-6"><Spinner /></div>}
        {!isLoading && locations.length === 0 && (
          <Empty message="No partner locations configured" />
        )}
        {locations.map(loc => (
          <LocationEditor key={loc.id} loc={loc} />
        ))}
      </div>
    </div>
  )
}
