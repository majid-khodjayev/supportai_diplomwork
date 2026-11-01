import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, CheckCheck, Mail, PenLine, Send, Sparkles, Trash2, X } from 'lucide-react'
import { api, ApiError } from '../api/client'
import type { Message, Priority, Status, TicketDetail, TicketPatch } from '../api/types'
import { useShell } from '../context/ShellContext'
import { useToast } from '../context/ToastContext'
import { AGENTS, CHANNEL_LABEL, PRIORITY_META, PRIORITY_ORDER, STATUS_META, STATUS_ORDER } from '../lib/constants'
import { cx, formatDateTime, formatTime } from '../lib/format'
import { useAsync } from '../hooks/useAsync'
import { Button } from './ui/Button'
import { StatusBadge, Tag } from './ui/Badges'
import { Select, Textarea } from './ui/Form'
import { Drawer } from './ui/Overlay'
import { Avatar, ErrorState, Skeleton } from './ui/Misc'

/** Один пузырь переписки. Клиент — слева, оператор — справа. */
export function MessageBubble({ message }: { message: Message }) {
  const mine = message.author === 'agent'
  return (
    <div className={cx('flex flex-col', mine ? 'items-end' : 'items-start')}>
      <div className="mb-1 flex items-center gap-2 px-1 text-xs text-muted">
        <span className="font-medium text-body">{message.author_name}</span>
        <span>{formatTime(message.created_at)}</span>
      </div>
      <p
        className={cx(
          'max-w-[88%] rounded-2xl px-4 py-2.5 text-[14.5px] leading-relaxed whitespace-pre-wrap',
          mine ? 'rounded-br-md bg-cobalt-600 text-white' : 'rounded-bl-md border border-line bg-mist/70 text-ink',
        )}
      >
        {message.text}
      </p>
    </div>
  )
}

/** Разделитель по дням внутри переписки. */
export function dayLabel(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date(iso))
}

export function Thread({ messages }: { messages: Message[] }) {
  let lastDay = ''
  return (
    <div className="space-y-4">
      {messages.map((message) => {
        const day = dayLabel(message.created_at)
        const showDay = day !== lastDay
        lastDay = day
        return (
          <div key={message.id} className="space-y-4">
            {showDay && (
              <div className="flex items-center gap-3 text-xs text-muted" aria-hidden>
                <span className="h-px flex-1 bg-line" />
                {day}
                <span className="h-px flex-1 bg-line" />
              </div>
            )}
            <MessageBubble message={message} />
          </div>
        )
      })}
    </div>
  )
}

interface Props {
  ticketId: number
  onClose: () => void
  onChanged: () => void
}

export function TicketDrawer({ ticketId, onClose, onChanged }: Props) {
  const { settings, version } = useShell()
  const toast = useToast()
  const { data, error, loading, reload } = useAsync(() => api.tickets.get(ticketId), [ticketId, version])
  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState<'send' | 'resolve' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (data) setTicket(data)
  }, [data])

  useEffect(() => {
    setDraft('')
    setConfirmDelete(false)
    setTicket(null)
  }, [ticketId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [ticket?.messages.length, ticket?.id])

  const fail = (err: unknown, fallback: string) =>
    toast.error(err instanceof ApiError ? err.message : fallback)

  const patch = async (changes: TicketPatch, okText: string) => {
    try {
      const updated = await api.tickets.update(ticketId, changes)
      setTicket(updated)
      toast.success(okText)
      onChanged()
    } catch (err) {
      fail(err, 'Не удалось сохранить изменения')
    }
  }

  const send = async (resolveAfter: boolean) => {
    const text = draft.trim()
    if (!text) return
    setSending(resolveAfter ? 'resolve' : 'send')
    try {
      let updated = await api.tickets.addMessage(ticketId, text)
      if (resolveAfter) updated = await api.tickets.update(ticketId, { status: 'resolved' })
      setTicket(updated)
      setDraft('')
      toast.success(resolveAfter ? 'Ответ отправлен, обращение решено' : 'Ответ отправлен')
      onChanged()
    } catch (err) {
      fail(err, 'Не удалось отправить сообщение')
    } finally {
      setSending(null)
    }
  }

  const remove = async () => {
    try {
      await api.tickets.remove(ticketId)
      toast.success('Обращение удалено')
      onChanged()
      onClose()
    } catch (err) {
      fail(err, 'Не удалось удалить обращение')
    }
  }

  const current = ticket ?? (data && data.id === ticketId ? data : null)

  return (
    <Drawer label="Карточка обращения" onClose={onClose}>
      {!current ? (
        <div className="flex-1 p-6">
          {error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : (
            <div className="space-y-4" aria-busy={loading}>
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-24" />
              <Skeleton className="h-40" />
            </div>
          )}
          <Button className="mt-4" variant="ghost" onClick={onClose}>
            Закрыть
          </Button>
        </div>
      ) : (
        <>
          <header className="border-b border-line px-5 pt-5 pb-4 sm:px-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="tnum text-[13px] font-semibold text-cobalt-700">{current.code}</span>
                  <StatusBadge status={current.status} />
                  <Tag>{current.category}</Tag>
                </div>
                <h2 className="font-display text-[1.375rem] leading-snug font-semibold tracking-tight text-balance">
                  {current.subject}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="-mt-1 -mr-2 shrink-0 rounded-control p-2 text-muted transition-colors hover:bg-mist-2 hover:text-ink"
                aria-label="Закрыть карточку"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-control bg-mist/80 p-3">
              <Avatar name={current.customer.name} size="lg" />
              <div className="min-w-0 text-sm">
                <p className="truncate font-medium text-ink">{current.customer.name}</p>
                <p className="flex items-center gap-1.5 truncate text-[13px] text-body">
                  <Mail className="size-3.5 shrink-0 text-muted" aria-hidden />
                  {current.customer.email}
                </p>
                {current.customer.company && (
                  <p className="flex items-center gap-1.5 truncate text-[13px] text-body">
                    <Building2 className="size-3.5 shrink-0 text-muted" aria-hidden />
                    {current.customer.company}
                  </p>
                )}
              </div>
              <div className="ml-auto hidden text-right text-xs text-muted sm:block">
                <p>Создано {formatDateTime(current.created_at)}</p>
                <p>Канал: {CHANNEL_LABEL[current.channel].toLowerCase()}</p>
                {current.customer.tickets_count ? <p>Всего обращений: {current.customer.tickets_count}</p> : null}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Статус</span>
                <Select
                  value={current.status}
                  onChange={(e) => patch({ status: e.target.value as Status }, 'Статус обновлён')}
                  aria-label="Статус обращения"
                >
                  {STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_META[s].label}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Приоритет</span>
                <Select
                  value={current.priority}
                  onChange={(e) => patch({ priority: e.target.value as Priority }, 'Приоритет обновлён')}
                  aria-label="Приоритет обращения"
                >
                  {[...PRIORITY_ORDER].reverse().map((p) => (
                    <option key={p} value={p}>
                      {PRIORITY_META[p].label}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Исполнитель</span>
                <Select
                  value={current.assignee ?? ''}
                  onChange={(e) =>
                    patch({ assignee: e.target.value || null }, e.target.value ? 'Исполнитель назначен' : 'Исполнитель снят')
                  }
                  aria-label="Исполнитель"
                >
                  <option value="">Не назначен</option>
                  {AGENTS.concat(
                    current.assignee && !AGENTS.includes(current.assignee) ? [current.assignee] : [],
                  ).map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </Select>
              </label>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            <Thread messages={current.messages} />
            <div ref={bottomRef} />
          </div>

          <footer className="border-t border-line bg-white px-5 py-4 sm:rounded-bl-float sm:px-6">
            {current.status === 'resolved' && (
              <p className="mb-2 flex items-center gap-2 text-[13px] text-ok-700">
                <CheckCheck className="size-4" aria-hidden />
                Обращение решено. Новый ответ вернёт его в работу.
              </p>
            )}
            <Textarea
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault()
                  void send(false)
                }
              }}
              placeholder="Напишите ответ клиенту. Ctrl + Enter — отправить"
              aria-label="Ответ клиенту"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                variant="primary"
                icon={<Send className="size-4" />}
                disabled={!draft.trim() || sending !== null}
                loading={sending === 'send'}
                onClick={() => void send(false)}
              >
                Отправить
              </Button>
              <Button
                icon={<CheckCheck className="size-4" />}
                disabled={!draft.trim() || sending !== null}
                loading={sending === 'resolve'}
                onClick={() => void send(true)}
              >
                Отправить и решить
              </Button>
              {settings?.signature && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<PenLine className="size-4" />}
                  onClick={() => setDraft((d) => (d ? `${d}\n\n${settings.signature}` : settings.signature))}
                >
                  Подпись
                </Button>
              )}
              <div className="ml-auto flex items-center gap-1">
                <Link
                  to={`/assistant?ticket=${current.id}`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-control px-3 text-[13px] font-medium text-violet-700 transition-colors hover:bg-violet-50"
                >
                  <Sparkles className="size-4" aria-hidden />
                  В AI-помощник
                </Link>
                {confirmDelete ? (
                  <>
                    <Button variant="danger" size="sm" onClick={() => void remove()}>
                      Удалить навсегда
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                      Отмена
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Trash2 className="size-4" />}
                    onClick={() => setConfirmDelete(true)}
                    aria-label="Удалить обращение"
                  />
                )}
              </div>
            </div>
          </footer>
        </>
      )}
    </Drawer>
  )
}
