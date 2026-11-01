import type { ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { cx, initials } from '../../lib/format'
import { Button } from './Button'

const AVATAR_TONES = [
  'bg-cobalt-100 text-cobalt-700',
  'bg-violet-100 text-violet-700',
  'bg-cobalt-50 text-cobalt-600',
  'bg-violet-50 text-violet-600',
]

export function Avatar({ name, size = 'md', className }: { name: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-1 ring-ink/5 select-none',
        AVATAR_TONES[hash % AVATAR_TONES.length],
        size === 'sm' && 'size-7 text-[11px]',
        size === 'md' && 'size-9 text-xs',
        size === 'lg' && 'size-12 text-base',
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('skeleton', className)} aria-hidden />
}

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode
  title: string
  text?: string
  action?: ReactNode
}) {
  return (
    <div className="flex animate-rise flex-col items-center px-6 py-14 text-center">
      <span className="mb-6 grid size-14 place-items-center rounded-2xl border border-cobalt-100 bg-white text-cobalt-600 shadow-[0_6px_16px_-8px_rgb(42_68_212/0.35)] ring-8 ring-cobalt-50/70">
        {icon}
      </span>
      <h3 className="font-display text-lg font-semibold tracking-tight">{title}</h3>
      {text && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex animate-rise flex-col items-center px-6 py-12 text-center" role="alert">
      <span className="mb-6 grid size-14 place-items-center rounded-2xl border border-danger-500/20 bg-white text-danger-600 shadow-[0_6px_16px_-8px_rgb(207_59_59/0.35)] ring-8 ring-danger-50/70">
        <AlertTriangle className="size-5" aria-hidden />
      </span>
      <h3 className="font-display text-lg font-semibold tracking-tight">Не удалось загрузить данные</h3>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">{message}</p>
      {onRetry && (
        <Button className="mt-5" icon={<RefreshCw className="size-4" />} onClick={onRetry}>
          Повторить
        </Button>
      )}
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-[1.75rem] leading-tight font-semibold tracking-tight sm:text-[2rem]">
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 max-w-3xl text-[15px] leading-relaxed text-body">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

interface SegmentedProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: Array<{ value: T; label: string }>
  label: string
  size?: 'sm' | 'md'
}

/** Переключатель из нескольких вариантов (например, «7 / 14 / 30 дней»). */
export function Segmented<T extends string>({ value, onChange, options, label, size = 'md' }: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-control border border-line bg-mist-2/70 p-0.5"
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cx(
              'rounded-[0.5rem] font-medium whitespace-nowrap transition-[background-color,color,box-shadow] duration-150',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3.5 text-[13px]',
              active
                ? 'bg-white text-ink shadow-[0_1px_2px_rgb(24_28_53/0.12)]'
                : 'text-body hover:text-ink',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function Meter({
  value,
  max,
  className,
  barClassName = 'bg-cobalt-600',
  label,
}: {
  value: number
  max: number
  className?: string
  barClassName?: string
  label: string
}) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div
      className={cx('h-1.5 w-full overflow-hidden rounded-full bg-mist-2', className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <div
        className={cx('h-full rounded-full transition-[width] duration-700 ease-quint', barClassName)}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}
