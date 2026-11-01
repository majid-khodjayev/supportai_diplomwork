import { useEffect, useId, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cx } from '../../lib/format'

function useOverlayBehavior(onClose: () => void) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])
}

interface ModalProps {
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  width?: string
}

/** Окно по центру экрана (форма создания, подтверждение). */
export function Modal({ title, description, onClose, children, footer, width = 'max-w-xl' }: ModalProps) {
  useOverlayBehavior(onClose)
  const titleId = useId()
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 animate-overlay bg-ink/40" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cx(
          'relative flex max-h-[92dvh] w-full animate-modal flex-col rounded-t-float bg-white shadow-float sm:rounded-float',
          width,
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div>
            <h2 id={titleId} className="font-display text-xl font-semibold tracking-tight">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="-mt-1 -mr-2 rounded-control p-2 text-muted transition-colors hover:bg-mist-2 hover:text-ink"
            aria-label="Закрыть"
          >
            <X className="size-5" />
          </button>
        </header>
        <div className="overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3.5 sm:px-6">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}

interface DrawerProps {
  label: string
  onClose: () => void
  children: ReactNode
}

/** Панель, выезжающая справа (карточка обращения). На телефоне занимает весь экран. */
export function Drawer({ label, onClose, children }: DrawerProps) {
  useOverlayBehavior(onClose)
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 animate-overlay bg-ink/35" onClick={onClose} aria-hidden />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="relative flex h-full w-full max-w-[40rem] animate-drawer flex-col bg-white shadow-float sm:rounded-l-float"
      >
        {children}
      </aside>
    </div>
  )
}
