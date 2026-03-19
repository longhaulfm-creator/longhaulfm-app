// src/routes/partner.tsx
import { createFileRoute } from '@tanstack/react-router'
import { PartnerPanel } from '@/components/PartnerPanel'

export const Route = createFileRoute('/partner')({
  component: PartnerPage,
})

function PartnerPage() {
  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-hidden animate-fade-in">
      <div className="flex-shrink-0">
        <h1 className="font-display text-3xl tracking-wider text-amber">Partner Locations</h1>
        <p className="font-ui text-xs text-ink-dim uppercase tracking-wider mt-0.5">
          Truck wash, convenience store & stops — live listener info
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <PartnerPanel />
      </div>
    </div>
  )
}
