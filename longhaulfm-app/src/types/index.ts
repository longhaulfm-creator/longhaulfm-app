// src/types/index.ts

export type BroadcastSource = 'spotify' | 'live' | 'talk' | 'news' | 'promo' | 'auto'
export type ShowLanguage    = 'en' | 'zu' | 'xh' | 'af' | 'mixed'
export type UserRole        = 'admin' | 'presenter' | 'advertiser' | 'listener'
export type CallerStatus    = 'waiting' | 'on_air' | 'done' | 'dropped'
export type AlertSeverity   = 'info' | 'warning' | 'critical'
export type AlertCategory   = 'incident' | 'roadworks' | 'weather' | 'weighbridge' | 'fuel' | 'closure'
export type AdSlotType      = 'pre_roll' | 'mid_roll' | 'sponsor_read' | 'road_report_sponsor'
export type AdStatus        = 'pending' | 'active' | 'paused' | 'completed' | 'cancelled'

export interface Profile {
  id:           string
  display_name: string
  role:         UserRole
  avatar_url:   string | null
  phone:        string | null
  created_at:   string
}

export interface BroadcastState {
  id:              number
  current_source:  BroadcastSource
  current_show_id: string | null
  switched_at:     string
  switched_by:     string | null
  is_on_air:       boolean
  listener_count:  number
  updated_at:      string
}

export interface NowPlaying {
  id:            number
  track_title:   string | null
  track_artist:  string | null
  track_album:   string | null
  artwork_url:   string | null
  duration_secs: number | null
  elapsed_secs:  number
  source:        BroadcastSource
  show_id:       string | null
  started_at:    string
  updated_at:    string
}

export interface Show {
  id:             string
  name:           string
  name_zu:        string | null
  name_xh:        string | null
  name_af:        string | null
  description:    string | null
  language:       ShowLanguage
  host_id:        string | null
  default_source: BroadcastSource
  cover_url:      string | null
  is_active:      boolean
  created_at:     string
}

export interface ScheduleSlot {
  id:                  string
  show_id:             string
  day_of_week:         number
  start_time:          string
  end_time:            string
  source:              BroadcastSource
  is_automated:        boolean
  spotify_playlist_id: string | null
  notes:               string | null
  show?:               Show
}

export interface RoadAlert {
  id:          string
  route:       string
  detail:      string
  category:    AlertCategory
  severity:    AlertSeverity
  province:    string
  lat:         number | null
  lng:         number | null
  source:      string | null
  is_active:   boolean
  expires_at:  string | null
  created_at:  string
}

export interface Caller {
  id:          string
  name:        string
  phone:       string | null
  location:    string | null
  topic:       string | null
  language:    ShowLanguage
  status:      CallerStatus
  show_id:     string | null
  queued_at:   string
  answered_at: string | null
  ended_at:    string | null
}

export interface AdCampaign {
  id:            string
  advertiser_id: string
  name:          string
  status:        AdStatus
  slot_type:     AdSlotType
  languages:     ShowLanguage[]
  budget_zar:    number | null
  spend_zar:     number
  spots_booked:  number
  spots_played:  number
  start_date:    string
  end_date:      string | null
  audio_url:     string | null
  script_text:   string | null
  advertiser?:   { company_name: string }
}

export interface PartnerLocation {
  id:              string
  advertiser_id:   string | null
  name:            string
  route:           string | null
  services:        string[]
  bays_available:  number | null
  fuel_price_zar:  number | null
  todays_special:  string | null
  special_expires: string | null
  updated_at:      string
}

export interface SpotifyAuth {
  id: string; // 'master-dj-token'
  access_token: string;
  refresh_token: string;
  expires_at: string; // ISO timestamp
  token_type: string;
  scope: string;
}

