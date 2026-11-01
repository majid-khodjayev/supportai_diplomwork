// Общие части графиков: цвета, подсказка при наведении, мини-график.
import { TrendingDown, TrendingUp } from 'lucide-react'
import { cx, formatNumber } from '../lib/format'

// Цвета серий. Пара «синий + фиолетовый» проверена на различимость, в том числе при дальтонизме.
export const CHART = {
  created: '#2a44d4',
  resolved: '#8b7cf6',
  grid: '#e4e7f0',
  tick: '#6b7394',
  cursor: '#c0cbfa',
}

interface TooltipRow {
  name?: string
  value?: number | string
  color?: string
}

interface TooltipProps {
  active?: boolean
  label?: string
  payload?: TooltipRow[]
}

/** Подсказка при наведении на график. */
export function ChartTooltip({ active, label, payload }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="min-w-36 rounded-control border border-line bg-white px-3 py-2.5 shadow-pop">
      {label && <p className="mb-1.5 text-xs font-medium text-muted">{label}</p>}
      <ul className="space-y-1">
        {payload.map((row) => (
          <li key={row.name} className="flex items-center justify-between gap-5 text-[13px]">
            <span className="flex items-center gap-2 text-body">
              <span className="size-2 rounded-full" style={{ background: row.color }} aria-hidden />
              {row.name}
            </span>
            <span className="tnum font-semibold text-ink">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Мини-график без осей для карточек показателей. */
export function Sparkline({ values, color = CHART.created, className }: { values: number[]; color?: string; className?: string }) {
  if (values.length < 2) return null
  const width = 96
  const height = 32
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const span = max - min || 1
  const step = width / (values.length - 1)
  const points = values.map((v, i) => [i * step, height - 3 - ((v - min) / span) * (height - 8)] as const)
  const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const last = points[points.length - 1]
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cx('h-8 w-24', className)} aria-hidden>
      <path d={line} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={color} stroke="#fff" strokeWidth="1.5" />
    </svg>
  )
}

/** Изменение показателя в процентах. goodWhen — в какую сторону изменение считается хорошим. */
export function TrendChip({
  pct,
  goodWhen,
  suffix,
}: {
  pct: number | null
  goodWhen: 'up' | 'down' | 'neutral'
  suffix: string
}) {
  if (pct === null) {
    return <span className="text-xs text-muted">Нет данных для сравнения</span>
  }
  const up = pct > 0
  const flat = pct === 0
  const good = goodWhen === 'neutral' || flat ? null : (goodWhen === 'up') === up
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
      <span
        className={cx(
          'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold whitespace-nowrap',
          good === null && 'bg-mist-2 text-body',
          good === true && 'bg-ok-50 text-ok-700',
          good === false && 'bg-warn-50 text-warn-700',
        )}
      >
        {!flat && <Icon className="size-3" aria-hidden />}
        <span className="tnum">
          {up ? '+' : ''}
          {formatNumber(pct, 1)} %
        </span>
      </span>
      <span className="text-muted">{suffix}</span>
    </span>
  )
}
