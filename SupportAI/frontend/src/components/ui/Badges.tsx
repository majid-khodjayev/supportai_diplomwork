import type { ReactNode } from 'react'
import { Mail, MessageCircle, Phone, Send } from 'lucide-react'
import type { Channel, Priority, Status } from '../../api/types'
import { CHANNEL_LABEL, PRIORITY_META, STATUS_META } from '../../lib/constants'
import { cx } from '../../lib/format'

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const meta = STATUS_META[status]
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        meta.badge,
        className,
      )}
    >
      <span className={cx('size-1.5 rounded-full', meta.dot)} aria-hidden />
      {meta.label}
    </span>
  )
}

/** Приоритет: четыре «деления» показывают уровень, подпись — название. */
export function PriorityMeter({
  priority,
  showLabel = true,
  className,
}: {
  priority: Priority
  showLabel?: boolean
  className?: string
}) {
  const meta = PRIORITY_META[priority]
  return (
    <span
      className={cx('inline-flex items-center gap-2 text-[13px] whitespace-nowrap', meta.tone, className)}
      title={`Приоритет: ${meta.label.toLowerCase()}`}
    >
      <span className="flex items-end gap-[2px]" aria-hidden>
        {[1, 2, 3, 4].map((step) => (
          <span
            key={step}
            className={cx(
              'w-[3px] rounded-[1px]',
              step <= meta.level ? meta.bar : 'bg-line',
              step === 1 && 'h-1.5',
              step === 2 && 'h-2',
              step === 3 && 'h-2.5',
              step === 4 && 'h-3',
            )}
          />
        ))}
      </span>
      {showLabel ? <span>{meta.label}</span> : <span className="sr-only">{meta.label}</span>}
    </span>
  )
}

const CHANNEL_ICON = {
  email: Mail,
  chat: MessageCircle,
  phone: Phone,
  telegram: Send,
} as const

export function ChannelTag({ channel, className }: { channel: Channel; className?: string }) {
  const Icon = CHANNEL_ICON[channel]
  return (
    <span className={cx('inline-flex items-center gap-1.5 text-[13px] text-body', className)}>
      <Icon className="size-3.5 text-muted" aria-hidden />
      {CHANNEL_LABEL[channel]}
    </span>
  )
}

export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full bg-mist-2 px-2.5 py-0.5 text-xs font-medium text-body',
        className,
      )}
    >
      {children}
    </span>
  )
}
