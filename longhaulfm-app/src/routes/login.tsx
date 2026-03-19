// src/routes/login.tsx
import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const { signIn, isLoading } = useAuthStore()
  const navigate = useNavigate()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!email || !password) return
    setError(null)
    const err = await signIn(email, password)
    if (err) {
      setError(err)
    } else {
      navigate({ to: '/' })
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div className="road-texture h-screen w-screen flex items-center justify-center bg-asphalt">
      {/* Amber road line decoration */}
      <div className="fixed inset-x-0 top-0 h-0.5 bg-amber" />
      <div className="fixed inset-x-0 bottom-0 h-0.5 bg-amber/30" />

      <div className="relative z-10 w-full max-w-sm flex flex-col gap-6 p-8 bg-road border border-marking rounded-md shadow-panel animate-fade-in">
        {/* Logo */}
        <div className="text-center flex flex-col gap-1">
          <h1 className="font-display text-5xl tracking-widest text-amber">🚛 Long Haul FM</h1>
          <p className="font-ui text-xs tracking-widest uppercase text-ink-dim">
            Broadcast Operations · KwaZulu-Natal
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-marking" />

        {/* Form */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="font-ui text-2xs font-bold tracking-widest uppercase text-ink-muted">
              Email
            </label>
            <input
              className={cn('input', error && 'border-signal-red')}
              type="email"
              placeholder="presenter@longhaulfm.co.za"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={handleKey}
              autoFocus
              data-selectable
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-ui text-2xs font-bold tracking-widest uppercase text-ink-muted">
              Password
            </label>
            <input
              className={cn('input', error && 'border-signal-red')}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={handleKey}
              data-selectable
            />
          </div>

          {error && (
            <p className="font-body text-xs text-signal-red animate-fade-in">{error}</p>
          )}

          <Button
            variant="primary"
            className="w-full mt-1"
            loading={isLoading}
            onClick={handleSubmit}
          >
            Sign In
          </Button>
        </div>

        <p className="font-body text-2xs text-ink-dim text-center">
          Access restricted to authorised presenters and operators.
        </p>
      </div>
    </div>
  )
}
