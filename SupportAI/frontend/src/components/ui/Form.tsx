import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { ChevronDown, Search, X } from 'lucide-react'
import { cx } from '../../lib/format'

const CONTROL =
  'w-full rounded-control border border-line-strong bg-white px-3 text-sm text-ink placeholder:text-muted/80 transition-[border-color,box-shadow] duration-150 hover:border-cobalt-300 focus:border-cobalt-500 focus:shadow-[0_0_0_3px_rgb(70_96_226/0.16)] focus:outline-none disabled:bg-mist disabled:text-muted'

interface FieldProps {
  label: string
  hint?: string
  children: (id: string) => ReactNode
  className?: string
}

/** Подпись + поле + подсказка. Передайте функцию, которая принимает id и рисует поле. */
export function Field({ label, hint, children, className }: FieldProps) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-ink">
        {label}
      </label>
      {children(id)}
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cx(CONTROL, 'h-10', className)} {...rest} />
  },
)

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return <textarea ref={ref} className={cx(CONTROL, 'resize-y py-2.5 leading-relaxed', className)} {...rest} />
  },
)

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cx(CONTROL, 'h-10 appearance-none pr-9', className)}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
      </div>
    )
  },
)

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  className?: string
  label?: string
}

export function SearchInput({ value, onChange, placeholder, className, label }: SearchInputProps) {
  return (
    <div className={cx('relative', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label ?? placeholder}
        className={cx(CONTROL, 'h-10 pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden')}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-muted transition-colors hover:bg-mist-2 hover:text-ink"
          aria-label="Очистить поиск"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}

interface ToggleProps {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  description?: string
}

export function Toggle({ checked, onChange, label, description }: ToggleProps) {
  return (
    <div className="flex items-start justify-between gap-6 py-3.5">
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative mt-0.5 h-6 w-10 shrink-0 rounded-full transition-colors duration-200',
          checked ? 'bg-cobalt-600' : 'bg-line-strong',
        )}
      >
        <span
          className={cx(
            'absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-[0_1px_3px_rgb(24_28_53/0.3)] transition-transform duration-200 ease-quint',
            checked && 'translate-x-4',
          )}
        />
      </button>
    </div>
  )
}

export function FormError({ message, details }: { message: string | null; details?: string[] }) {
  if (!message) return null
  const list = details && details.length > 1 ? details : []
  return (
    <div role="alert" className="rounded-control border border-danger-500/30 bg-danger-50 px-3.5 py-2.5 text-sm text-danger-700">
      {list.length ? (
        <ul className="list-disc space-y-0.5 pl-4">
          {list.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        message
      )}
    </div>
  )
}
