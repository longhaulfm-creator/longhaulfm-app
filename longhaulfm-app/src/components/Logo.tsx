import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 400 400" 
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-16 w-auto drop-shadow-[0_0_15px_rgba(218,165,32,0.3)]", className)}
    >
      {/* Circular badge */}
      <circle cx="200" cy="200" r="180" fill="#1B3A52" stroke="#DAA520" stroke-width="8"/>
      
      {/* Radio tower antenna */}
      <line x1="200" y1="120" x2="200" y2="80" stroke="#DAA520" stroke-width="6" stroke-linecap="round"/>
      
      {/* Animated Radio waves */}
      <g className="animate-pulse">
        <path d="M 160 140 Q 200 115, 240 140" stroke="#DAA520" stroke-width="5" fill="none" stroke-linecap="round" />
        <path d="M 140 165 Q 200 120, 260 165" stroke="#DAA520" stroke-width="5" fill="none" stroke-linecap="round" className="opacity-70" />
        <path d="M 120 190 Q 200 125, 280 190" stroke="#DAA520" stroke-width="5" fill="none" stroke-linecap="round" className="opacity-40" />
      </g>

      {/* Text Elements */}
      <text

      x={200}

      y={245}

      fill="#DAA520"

      fontFamily="Arial Black, sans-serif"

      fontSize={56}

      fontWeight={900}

      textAnchor="middle"

    >

      {"FM"}

    </text>

    <text

      x={200}

      y={310}

      fill="#FFF"

      fontFamily="Arial Black, sans-serif"

      fontSize={36}

      fontWeight={900}

      letterSpacing={2}

      textAnchor="middle"

    >

      {"LONG HAUL"}

    </text>
    </svg>
  )
}