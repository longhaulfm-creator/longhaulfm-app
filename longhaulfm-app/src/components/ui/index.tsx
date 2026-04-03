// src/components/ui/index.tsx
// Lightweight UI primitives — no external component library needed

import { cn } from '@/lib/utils'
import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes } from 'react'

// ── Button ─────────────────────────────────────────────────

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
  size?:    'sm' | 'md'
  loading?: boolean
  children: ReactNode
}

export function Button({
  variant = 'ghost', size = 'md', loading, children, className, disabled, ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'btn',
        variant === 'primary' && 'btn-primary',
        variant === 'ghost'   && 'btn-ghost',
        variant === 'danger'  && 'btn-danger',
        size === 'sm'         && 'btn-sm',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <span className="opacity-60">Loading…</span> : children}
    </button>
  )
}

// ── Badge ──────────────────────────────────────────────────

interface BadgeProps {
  variant?: 'live' | 'spotify' | 'talk' | 'auto' | 'news' | 'promo'
  children: ReactNode
  className?: string
}

export function Badge({ variant = 'auto', children, className }: BadgeProps) {
  return (
    <span className={cn('badge', `badge-${variant}`, className)}>
      {children}
    </span>
  )
}

// ── Card ───────────────────────────────────────────────────

interface CardProps {
  title?:     string
  action?:    ReactNode
  children:   ReactNode
  className?: string
  bodyClass?: string
}

export function Card({ title, action, children, className, bodyClass }: CardProps) {
  return (
    <div className={cn('panel', className)}>
      {(title || action) && (
        <div className="panel-header">
          {title && <span className="panel-title">{title}</span>}
          {action}
        </div>
      )}
      <div className={cn('p-3', bodyClass)}>{children}</div>
    </div>
  )
}

// ── Input ──────────────────────────────────────────────────

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?:     string
  error?:     string
  className?: string
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="font-ui text-2xs font-bold tracking-widest uppercase text-ink-muted">
          {label}
        </label>
      )}
      <input className={cn('input', error && 'border-signal-red', className)} {...props} />
      {error && <span className="text-2xs text-signal-red">{error}</span>}
    </div>
  )
}

// ── Textarea ───────────────────────────────────────────────

interface TextareaProps {
  label?:     string
  error?:     string
  className?: string
  rows?:      number
  value?:     string
  placeholder?: string
  onChange?:  (e: React.ChangeEvent<HTMLTextAreaElement>) => void
}

export function Textarea({ label, error, className, rows = 3, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="font-ui text-2xs font-bold tracking-widest uppercase text-ink-muted">
          {label}
        </label>
      )}
      <textarea
        rows={rows}
        className={cn('input resize-none', error && 'border-signal-red', className)}
        {...props}
      />
      {error && <span className="text-2xs text-signal-red">{error}</span>}
    </div>
  )
}

// ── Select ─────────────────────────────────────────────────

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?:     string
  children:   ReactNode
  className?: string
}

export function Select({ label, children, className, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="font-ui text-2xs font-bold tracking-widest uppercase text-ink-muted">
          {label}
        </label>
      )}
      <select
        className={cn(
          'input appearance-none cursor-pointer',
          'bg-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'6\'%3E%3Cpath d=\'M0 0l5 6 5-6z\' fill=\'%237a8094\'/%3E%3C/svg%3E")] bg-no-repeat bg-[right_10px_center]',
          className
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  )
}

// ── Divider ────────────────────────────────────────────────

export function Divider({ className }: { className?: string }) {
  return <div className={cn('h-px bg-marking my-2', className)} />
}

// ── Spinner ────────────────────────────────────────────────

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn('w-4 h-4 border-2 border-marking border-t-amber rounded-full animate-spin', className)} />
  )
}

// ── Empty state ────────────────────────────────────────────

export function Empty({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-8 text-ink-dim font-ui text-xs tracking-wider uppercase">
      {message}
    </div>
  )
}
