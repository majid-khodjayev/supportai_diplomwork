// Все обращения к backend собраны в одном месте.
// Нужно новое действие? Добавьте функцию в объект `api` ниже.
import type {
  Article,
  ArticleInput,
  BillingPeriod,
  Category,
  Customer,
  NewTicket,
  PlanId,
  PlansInfo,
  Settings,
  StatsOverview,
  Suggestion,
  TicketDetail,
  TicketList,
  TicketPatch,
  TicketQuery,
} from './types'

export class ApiError extends Error {
  status: number
  errors: string[]

  constructor(message: string, status: number, errors: string[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

// В разработке запросы идут через прокси Vite (см. vite.config.ts), поэтому база пустая.
const BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')

function query(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  })
  const text = search.toString()
  return text ? `?${text}` : ''
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE}/api${path}`, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(
      'Не удаётся связаться с сервером. Проверьте, что backend запущен (окно «SupportAI Backend»).',
      0,
    )
  }

  if (response.status === 204) return undefined as T

  const text = await response.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }

  if (!response.ok) {
    const payload = (data ?? {}) as { detail?: unknown; errors?: unknown }
    const message =
      typeof payload.detail === 'string' ? payload.detail : `Ошибка сервера (${response.status})`
    const errors = Array.isArray(payload.errors) ? (payload.errors as string[]) : []
    throw new ApiError(message, response.status, errors)
  }
  return data as T
}

export const api = {
  tickets: {
    list: (params: TicketQuery = {}) =>
      request<TicketList>('GET', `/tickets${query({ ...params })}`),
    get: (id: number) => request<TicketDetail>('GET', `/tickets/${id}`),
    create: (data: NewTicket) => request<TicketDetail>('POST', '/tickets', data),
    update: (id: number, data: TicketPatch) =>
      request<TicketDetail>('PATCH', `/tickets/${id}`, data),
    remove: (id: number) => request<void>('DELETE', `/tickets/${id}`),
    addMessage: (id: number, text: string) =>
      request<TicketDetail>('POST', `/tickets/${id}/messages`, { text, author: 'agent' }),
  },
  customers: {
    list: (q = '', limit = 100) => request<Customer[]>('GET', `/customers${query({ q, limit })}`),
  },
  knowledge: {
    list: (q = '', category = '') =>
      request<Article[]>('GET', `/knowledge${query({ q, category })}`),
    categories: () => request<Category[]>('GET', '/knowledge/categories'),
    suggest: (text: string, limit = 3) =>
      request<Suggestion[]>('GET', `/knowledge/suggest${query({ text, limit })}`),
    create: (data: ArticleInput) => request<Article>('POST', '/knowledge', data),
    update: (id: number, data: Partial<ArticleInput>) =>
      request<Article>('PATCH', `/knowledge/${id}`, data),
    remove: (id: number) => request<void>('DELETE', `/knowledge/${id}`),
  },
  stats: {
    overview: (days = 14) => request<StatsOverview>('GET', `/stats/overview${query({ days })}`),
  },
  settings: {
    get: () => request<Settings>('GET', '/settings'),
    update: (data: Partial<Settings>) => request<Settings>('PATCH', '/settings', data),
    resetDemo: () => request<{ status: string }>('POST', '/settings/reset-demo'),
  },
  plans: {
    get: () => request<PlansInfo>('GET', '/plans'),
    select: (plan: PlanId, billing_period: BillingPeriod) =>
      request<PlansInfo>('POST', '/plans/select', { plan, billing_period }),
  },
}
