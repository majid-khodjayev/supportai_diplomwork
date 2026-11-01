// Типы данных, которые возвращает backend (см. backend/app/schemas.py).

export type Status = 'new' | 'open' | 'pending' | 'resolved'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type Channel = 'email' | 'chat' | 'phone' | 'telegram'
export type PlanId = 'starter' | 'business' | 'enterprise'
export type BillingPeriod = 'monthly' | 'yearly'

export interface Customer {
  id: number
  name: string
  email: string
  company: string | null
  tickets_count?: number | null
}

export interface Message {
  id: number
  ticket_id: number
  author: 'customer' | 'agent'
  author_name: string
  text: string
  created_at: string
}

export interface Ticket {
  id: number
  code: string
  subject: string
  status: Status
  priority: Priority
  channel: Channel
  category: string
  assignee: string | null
  rating: number | null
  created_at: string
  updated_at: string
  resolved_at: string | null
  customer: Customer
  messages_count: number
  last_message: string | null
  last_author: 'customer' | 'agent' | null
}

export interface TicketDetail extends Ticket {
  messages: Message[]
}

export interface TicketCounts {
  all: number
  new: number
  open: number
  pending: number
  resolved: number
}

export interface TicketList {
  items: Ticket[]
  total: number
  page: number
  page_size: number
  pages: number
  counts: TicketCounts
}

export interface TicketQuery {
  status?: Status | ''
  priority?: Priority | ''
  q?: string
  sort?: 'updated' | 'newest' | 'oldest' | 'priority'
  page?: number
  page_size?: number
}

export interface NewTicket {
  subject: string
  customer_name: string
  customer_email: string
  customer_company?: string
  priority: Priority
  channel: Channel
  category: string
  message: string
}

export interface TicketPatch {
  subject?: string
  status?: Status
  priority?: Priority
  channel?: Channel
  category?: string
  assignee?: string | null
}

export interface Article {
  id: number
  question: string
  answer: string
  category: string
  created_at: string
  updated_at: string
}

export interface Suggestion extends Article {
  score: number
}

export interface ArticleInput {
  question: string
  answer: string
  category: string
}

export interface Category {
  name: string
  count: number
}

export interface Settings {
  company_name: string
  operator_name: string
  support_email: string
  timezone: string
  work_start: string
  work_end: string
  default_priority: Priority
  signature: string
  notify_new_ticket: boolean
  notify_urgent: boolean
  notify_daily_digest: boolean
  plan: PlanId
  billing_period: BillingPeriod
}

export interface Plan {
  id: PlanId
  name: string
  tagline: string
  price_monthly: number
  price_yearly: number
  ticket_limit: number | null
  seats: number | null
  popular: boolean
  features: string[]
}

export interface PlansInfo {
  plans: Plan[]
  current_plan: PlanId
  billing_period: BillingPeriod
  tickets_used_30d: number
}

export interface Trend {
  current: number
  previous: number
  change_pct: number | null
}

export interface CountItem {
  key: string
  count: number
}

export interface SeriesPoint {
  date: string
  created: number
  resolved: number
  backlog: number
}

export interface StatsOverview {
  totals: {
    total: number
    active: number
    resolved: number
    new: number
    urgent_active: number
    resolution_rate: number
  }
  avg_resolution_hours: number | null
  csat: number | null
  csat_count: number
  trends: { created: Trend; resolved: Trend; active: Trend }
  series: SeriesPoint[]
  by_status: CountItem[]
  by_priority_active: CountItem[]
  by_channel: CountItem[]
  by_category: CountItem[]
}
