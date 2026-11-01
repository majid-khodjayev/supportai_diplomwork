// Справочники: названия статусов, приоритетов, каналов и т. д.
import type { Channel, Priority, Status } from '../api/types'

export const STATUS_ORDER: Status[] = ['new', 'open', 'pending', 'resolved']
export const PRIORITY_ORDER: Priority[] = ['urgent', 'high', 'medium', 'low']

export const STATUS_META: Record<
  Status,
  { label: string; badge: string; dot: string; bar: string }
> = {
  new: {
    label: 'Новое',
    badge: 'bg-cobalt-50 text-cobalt-700',
    dot: 'bg-cobalt-600',
    bar: 'bg-cobalt-600',
  },
  open: {
    label: 'В работе',
    badge: 'bg-violet-50 text-violet-700',
    dot: 'bg-violet-500',
    bar: 'bg-violet-500',
  },
  pending: {
    label: 'Ждём ответ',
    badge: 'bg-warn-50 text-warn-700',
    dot: 'bg-warn-500',
    bar: 'bg-warn-500',
  },
  resolved: {
    label: 'Решено',
    badge: 'bg-ok-50 text-ok-700',
    dot: 'bg-ok-500',
    bar: 'bg-ok-500',
  },
}

export const PRIORITY_META: Record<
  Priority,
  { label: string; level: 1 | 2 | 3 | 4; tone: string; bar: string }
> = {
  urgent: { label: 'Срочный', level: 4, tone: 'text-danger-600', bar: 'bg-danger-500' },
  high: { label: 'Высокий', level: 3, tone: 'text-warn-600', bar: 'bg-warn-500' },
  medium: { label: 'Средний', level: 2, tone: 'text-body', bar: 'bg-cobalt-500' },
  low: { label: 'Низкий', level: 1, tone: 'text-muted', bar: 'bg-line-strong' },
}

export const CHANNEL_LABEL: Record<Channel, string> = {
  email: 'Почта',
  chat: 'Чат',
  phone: 'Телефон',
  telegram: 'Telegram',
}

export const CHANNEL_ORDER: Channel[] = ['email', 'chat', 'telegram', 'phone']

// Список исполнителей совпадает с демо-данными. Добавьте свои имена, если нужно.
export const AGENTS = ['Анна Воронцова', 'Дмитрий Орлов', 'Лейла Рашидова']

export const CATEGORIES = [
  'Аккаунт и доступ',
  'Оплата и счета',
  'Тарифы',
  'Интеграции',
  'Отчёты и данные',
  'Технические вопросы',
  'Общее',
]

export const TIMEZONES = [
  'Asia/Tashkent',
  'Europe/Moscow',
  'Europe/Kyiv',
  'Europe/Minsk',
  'Asia/Almaty',
  'Asia/Yekaterinburg',
  'Asia/Novosibirsk',
  'Asia/Dubai',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'UTC',
]

export const PAGE_TITLES: Record<string, string> = {
  '/': 'Дашборд',
  '/tickets': 'Обращения',
  '/assistant': 'AI-помощник',
  '/knowledge': 'База знаний',
  '/plans': 'Тарифы',
  '/settings': 'Настройки',
}
