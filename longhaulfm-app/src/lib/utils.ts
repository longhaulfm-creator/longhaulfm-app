// src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, parseISO } from 'date-fns'

// Tailwind class merger
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format seconds as M:SS
export function fmtDuration(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = String(secs % 60).padStart(2, '0')
  return `${m}:${s}`
}

// Format a time string "HH:MM:SS" → "HH:MM"
export function fmtTime(timeStr: string): string {
  return timeStr.slice(0, 5)
}

// Format ISO date to relative string
export function fmtRelative(iso: string): string {
  return formatDistanceToNow(parseISO(iso), { addSuffix: true })
}

// Format ISO date to local time
export function fmtLocalTime(iso: string): string {
  return format(parseISO(iso), 'HH:mm')
}

// Day of week label
export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Language labels
export const LANG_LABELS: Record<string, string> = {
  en: 'English', zu: 'isiZulu', xh: 'isiXhosa', af: 'Afrikaans', mixed: 'Mixed',
}

export const LANG_SHORT: Record<string, string> = {
  en: 'EN', zu: 'ZU', xh: 'XH', af: 'AF', mixed: 'MX',
}

// Source display config
export const SOURCE_CONFIG = {
  spotify: { label: 'Spotify',  icon: '♫',  colour: '#1db954' },
  live:    { label: 'Live',     icon: '●',  colour: '#ff4d4d' },
  talk:    { label: 'Talk',     icon: '🎙', colour: '#4da6ff' },
  news:    { label: 'News',     icon: '📰', colour: '#ffd166' },
  promo:   { label: 'Promo',    icon: '📢', colour: '#f5a623' },
  auto:    { label: 'Auto DJ',  icon: '⚙',  colour: '#7a8094' },
} as const

// Alert category icons
export const ALERT_ICONS: Record<string, string> = {
  incident:    '⚠',
  roadworks:   'ℹ',
  weather:     '🌧',
  weighbridge: '⚖',
  fuel:        '⛽',
  closure:     '🚫',
}

// ZAR currency format
export function fmtZAR(amount: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency', currency: 'ZAR', minimumFractionDigits: 2,
  }).format(amount)
}

// Clamp a value between min and max
export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max)
}
