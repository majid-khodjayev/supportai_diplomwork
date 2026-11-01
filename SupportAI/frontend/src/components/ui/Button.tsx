import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cx } from '../../lib/format'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-cobalt-600 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_1px_2px_rgb(24_28_53/0.2)] hover:-translate-y-px hover:bg-cobalt-700 hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.2),0_8px_16px_-6px_rgb(42_68_212/0.5)] disabled:bg-cobalt-300 disabled:shadow-none disabled:hover:translate-y-0',
  secondary:
    'border border-line-strong bg-white text-ink hover:border-cobalt-300 hover:bg-cobalt-50/60 hover:shadow-[0_4px_12px_-6px_rgb(24_28_53/0.2)] disabled:text-muted disabled:shadow-none disabled:hover:border-line-strong disabled:hover:bg-white',
  ghost: 'text-body hover:bg-mist-2 hover:text-ink disabled:text-muted disabled:hover:bg-transparent',
  danger:
    'border border-danger-500/40 bg-white text-danger-600 hover:bg-danger-50 disabled:text-muted disabled:hover:bg-white',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 gap-1.5 px-3 text-[13px]',
  md: 'h-10 gap-2 px-4 text-sm',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-control font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow,translate,scale] duration-150 active:scale-[0.98] disabled:active:scale-100',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  )
}
