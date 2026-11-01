import { useId } from 'react'
import { cx } from '../../lib/format'

/** Знак: диалоговое облако с тремя точками — «разговор» с клиентом. */
export function LogoMark({ className }: { className?: string }) {
  const gradient = useId()
  return (
    <svg viewBox="0 0 32 32" className={cx('size-9', className)} aria-hidden>
      <defs>
        <linearGradient id={gradient} x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2a44d4" />
          <stop offset="1" stopColor="#8b7cf6" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gradient})`} />
      <path
        d="M9.5 9.5h13a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H16l-4.2 3.4a.6.6 0 0 1-1-.47V20.5H9.5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z"
        fill="#fff"
      />
      <circle cx="12.6" cy="15" r="1.2" fill="#4660e2" />
      <circle cx="16" cy="15" r="1.2" fill="#6f5fe8" />
      <circle cx="19.4" cy="15" r="1.2" fill="#8b7cf6" />
    </svg>
  )
}

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      <span className="text-[17px] font-semibold tracking-tight text-ink">SupportAI</span>
    </div>
  )
}
