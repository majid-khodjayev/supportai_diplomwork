import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { AlertCircle, CheckCircle2, X } from 'lucide-react'
import { cx } from '../lib/format'

type ToastKind = 'success' | 'error'
interface ToastItem {
  id: number
  kind: ToastKind
  text: string
}

interface ToastApi {
  success: (text: string) => void
  error: (text: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((item) => item.id !== id))
  }, [])

  const push = useCallback(
    (kind: ToastKind, text: string) => {
      const id = ++counter.current
      setItems((list) => [...list.slice(-2), { id, kind, text }])
      window.setTimeout(() => dismiss(id), kind === 'error' ? 6000 : 3500)
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({ success: (text) => push('success', text), error: (text) => push('error', text) }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[70] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
        aria-live="polite"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className="pointer-events-auto relative flex w-full max-w-sm animate-toast items-start gap-3 overflow-hidden rounded-panel border border-line bg-white py-3 pr-2 pl-3 shadow-pop sm:w-auto sm:min-w-72"
          >
            <span
              className={cx(
                'mt-px grid size-8 shrink-0 place-items-center rounded-lg',
                item.kind === 'success' ? 'bg-ok-50 text-ok-600' : 'bg-danger-50 text-danger-600',
              )}
            >
              {item.kind === 'success' ? (
                <CheckCircle2 className="size-[18px]" aria-hidden />
              ) : (
                <AlertCircle className="size-[18px]" aria-hidden />
              )}
            </span>
            <div className="min-w-0 flex-1 pt-px">
              <p className="text-[13px] font-semibold text-ink">
                {item.kind === 'success' ? 'Готово' : 'Не получилось'}
              </p>
              <p className="mt-0.5 text-[13px] leading-snug text-body">{item.text}</p>
            </div>
            <button
              onClick={() => dismiss(item.id)}
              className="rounded-md p-1 text-muted transition-colors hover:bg-mist hover:text-ink"
              aria-label="Закрыть уведомление"
            >
              <X className="size-4" />
            </button>
            {/* Тонкая полоса показывает, сколько ещё будет висеть уведомление */}
            <span
              className={cx('absolute inset-x-0 bottom-0 h-0.5 origin-left', item.kind === 'success' ? 'bg-ok-500/60' : 'bg-danger-500/60')}
              style={{ animation: `toast-timer ${item.kind === 'error' ? 6000 : 3500}ms linear forwards` }}
              aria-hidden
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast нужно вызывать внутри ToastProvider')
  return ctx
}
