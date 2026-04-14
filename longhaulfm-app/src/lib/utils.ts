// src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// FIXED: Robust duration formatter
export function fmtDuration(secs: number): string {
  if (secs === null || secs === undefined || isNaN(secs) || secs < 0) {
    return '0:00'
  }
  const m = Math.floor(secs / 60)
  const s = String(Math.floor(secs % 60)).padStart(2, '0')
  return `${m}:${s}`
}

export function fmtTime(timeStr: string): string {
  return timeStr.slice(0, 5)
}

export function fmtRelative(iso: string): string {
  return formatDistanceToNow(parseISO(iso), { addSuffix: true })
}

export function fmtLocalTime(iso: string): string {
  return format(parseISO(iso), 'HH:mm')
}

export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const LANG_LABELS: Record<string, string> = {
  en: 'English', zu: 'isiZulu', xh: 'isiXhosa', af: 'Afrikaans', mixed: 'Mixed',
}

export const LANG_SHORT: Record<string, string> = {
  en: 'EN', zu: 'ZU', xh: 'XH', af: 'AF', mixed: 'MX',
}

export const SOURCE_CONFIG = {
  spotify: { label: 'Spotify',  icon: '♫',  colour: '#1db954' },
  live:    { label: 'Live',     icon: '●',  colour: '#ff4d4d' },
  talk:    { label: 'Talk',     icon: '🎙', colour: '#4da6ff' },
  news:    { label: 'News',     icon: '📰', colour: '#ffd166' },
  promo:   { label: 'Promo',    icon: '📢', colour: '#f5a623' },
  auto:    { label: 'Auto DJ',  icon: '⚙',  colour: '#7a8094' },
} as const

export const ALERT_ICONS: Record<string, string> = {
  incident:    '⚠',
  roadworks:   'ℹ',
  weather:     '🌧',
  weighbridge: '⚖',
  fuel:        '⛽',
  closure:     '🚫',
}

export function fmtZAR(amount: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency', currency: 'ZAR', minimumFractionDigits: 2,
  }).format(amount)
}

export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max)
}