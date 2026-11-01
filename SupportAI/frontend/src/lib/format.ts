// Небольшие помощники для текста, дат и чисел.

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

/** Склонение: plural(5, ['обращение', 'обращения', 'обращений']) -> «обращений» */
export function plural(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n) % 100
  const last = abs % 10
  if (abs > 10 && abs < 20) return forms[2]
  if (last > 1 && last < 5) return forms[1]
  if (last === 1) return forms[0]
  return forms[2]
}

export function formatNumber(n: number, digits = 0): string {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n)
}

function parse(iso: string): Date {
  return new Date(iso)
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parse(iso))
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(parse(iso))
}

export function formatShortDate(isoDate: string): string {
  // isoDate вида 2026-10-30 — разбираем вручную, чтобы не было сдвига часового пояса
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })
    .format(new Date(y, m - 1, d))
    .replace('.', '')
}

export function formatLongDate(date = new Date()): string {
  const text = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** «5 мин назад», «3 ч назад», «вчера», «12 окт» */
export function timeAgo(iso: string): string {
  const then = parse(iso).getTime()
  const diff = Math.max(0, Date.now() - then)
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'только что'
  if (minutes < 60) return `${minutes} мин назад`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ч назад`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'вчера'
  if (days < 7) return `${days} ${plural(days, ['день', 'дня', 'дней'])} назад`
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })
    .format(parse(iso))
    .replace('.', '')
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export function formatHours(hours: number | null): string {
  if (hours === null) return '—'
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} мин`
  if (hours < 48) return `${formatNumber(hours, 1)} ч`
  return `${formatNumber(hours / 24, 1)} дн`
}
