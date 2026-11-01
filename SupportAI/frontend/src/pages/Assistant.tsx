import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, CheckCheck, ExternalLink, Inbox, Plus, Send, Sparkles, Wand2 } from 'lucide-react'
import { api, ApiError } from '../api/client'
import type { Suggestion } from '../api/types'
import { Thread } from '../components/TicketDrawer'
import { Button } from '../components/ui/Button'
import { PriorityMeter, StatusBadge } from '../components/ui/Badges'
import { Textarea, SearchInput } from '../components/ui/Form'
import { Avatar, EmptyState, ErrorState, PageHeader, Segmented, Skeleton } from '../components/ui/Misc'
import { useShell } from '../context/ShellContext'
import { useToast } from '../context/ToastContext'
import { useAsync, useDebounced } from '../hooks/useAsync'
import { cx, timeAgo } from '../lib/format'

type Filter = 'all' | 'hot'

function SuggestionCard({ item, onInsert }: { item: Suggestion; onInsert: (text: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onInsert(item.answer)}
      aria-label={`Вставить в ответ: ${item.question}`}
      title="Вставить в ответ"
      className="group flex w-64 shrink-0 flex-col rounded-control border border-line bg-white px-3 py-2.5 text-left transition-[border-color,box-shadow,translate] duration-200 hover:-translate-y-px hover:border-violet-300 hover:shadow-pop"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="truncate text-[13px] font-semibold text-ink">{item.question}</span>
        <Plus className="size-4 shrink-0 text-muted transition-colors group-hover:text-violet-600" aria-hidden />
      </span>
      <span className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-body">{item.answer}</span>
      <span className="mt-1.5 truncate text-[11px] text-muted">{item.category}</span>
    </button>
  )
}

export default function Assistant() {
  const { version, refresh, settings } = useShell()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const selectedId = Number(params.get('ticket')) || null

  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const q = useDebounced(search, 300)

  const queue = useAsync(
    () => api.tickets.list({ q, sort: 'priority', page_size: 100 }),
    [q, version],
  )
  const active = (queue.data?.items ?? []).filter(
    (t) => t.status !== 'resolved' && (filter === 'all' || t.priority === 'urgent' || t.priority === 'high'),
  )
  const activeId = selectedId ?? active[0]?.id ?? null

  const detail = useAsync(
    () => (activeId ? api.tickets.get(activeId) : Promise.resolve(null)),
    [activeId, version],
  )
  const ticket = detail.data && detail.data.id === activeId ? detail.data : null

  // Подсказки из базы знаний подбираются по теме и последнему сообщению клиента.
  const lastCustomer = ticket ? [...ticket.messages].reverse().find((m) => m.author === 'customer') : undefined
  const suggestions = useAsync(
    () =>
      ticket && lastCustomer
        ? api.knowledge.suggest(`${ticket.subject} ${lastCustomer.text}`.slice(0, 1900), 6)
        : Promise.resolve([] as Suggestion[]),
    [ticket?.id, ticket?.messages.length],
  )

  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => setDraft(''), [activeId])
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [ticket?.id, ticket?.messages.length, suggestions.data?.length])

  const select = (id: number | null) =>
    setParams(id ? { ticket: String(id) } : {}, { replace: false })

  const send = async (resolve: boolean) => {
    const text = draft.trim()
    if (!text || !ticket) return
    setSending(true)
    try {
      await api.tickets.addMessage(ticket.id, text)
      if (resolve) await api.tickets.update(ticket.id, { status: 'resolved' })
      setDraft('')
      toast.success(resolve ? 'Ответ отправлен, обращение решено' : 'Ответ отправлен')
      refresh()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Не удалось отправить ответ')
    } finally {
      setSending(false)
    }
  }

  const insert = (text: string) => {
    setDraft((d) => (d.trim() ? `${d.trimEnd()}\n\n${text}` : text))
    toast.success('Ответ из базы знаний вставлен. Проверьте текст перед отправкой.')
  }

  return (
    <>
      <PageHeader
        title="AI-помощник"
        subtitle="Переписка и подсказки из базы знаний в одном окне. Черновики от AI появятся позже."
      />

      <div className="panel grid h-[calc(100dvh-14.5rem)] min-h-[34rem] grid-cols-1 grid-rows-[minmax(0,1fr)] overflow-hidden lg:grid-cols-[19rem_minmax(0,1fr)]">
        {/* ------------------------------------------------ очередь */}
        <aside
          className={cx('min-h-0 flex-col border-line lg:flex lg:border-r', selectedId ? 'hidden' : 'flex')}
          aria-label="Очередь обращений"
        >
          <div className="space-y-3 border-b border-line p-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Поиск по очереди" />
            <Segmented<Filter>
              label="Фильтр очереди"
              size="sm"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'Все активные' },
                { value: 'hot', label: 'Срочные и высокие' },
              ]}
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {queue.error && !queue.data ? (
              <ErrorState message={queue.error} onRetry={queue.reload} />
            ) : !queue.data ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-[4.5rem]" />
                ))}
              </div>
            ) : active.length === 0 ? (
              <EmptyState
                icon={<Inbox className="size-5" />}
                title="Очередь пуста"
                text={search || filter === 'hot' ? 'По этим условиям ничего нет.' : 'Все обращения решены.'}
              />
            ) : (
              <ul className="divide-y divide-line">
                {active.map((t) => {
                  const current = t.id === activeId
                  return (
                    <li key={t.id}>
                      <button
                        onClick={() => select(t.id)}
                        aria-current={current}
                        className={cx(
                          'relative flex w-full gap-3 px-3.5 py-3 text-left transition-colors',
                          current ? 'bg-cobalt-50/70' : 'hover:bg-mist/70',
                        )}
                      >
                        {current && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-cobalt-600" aria-hidden />}
                        <Avatar name={t.customer.name} size="sm" className="mt-0.5" />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-[13px] font-semibold text-ink">{t.customer.name}</span>
                            <span className="shrink-0 text-xs text-muted">{timeAgo(t.updated_at)}</span>
                          </span>
                          <span className="block truncate text-[13px] text-body">{t.subject}</span>
                          <span className="mt-1.5 flex items-center gap-3">
                            <PriorityMeter priority={t.priority} showLabel={false} />
                            <StatusBadge status={t.status} className="px-2 py-px text-[11px]" />
                            {t.last_author === 'customer' && t.status !== 'new' && (
                              <span className="text-xs font-medium text-cobalt-700">Ждёт ответа</span>
                            )}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* ------------------------------------------------ чат */}
        <section className={cx('min-h-0 min-w-0 flex-col lg:flex', selectedId ? 'flex' : 'hidden')} aria-label="Переписка">
          {!activeId ? (
            <div className="m-auto">
              <EmptyState
                icon={<Sparkles className="size-5" />}
                title="Выберите обращение"
                text="Откройте обращение из очереди, чтобы увидеть переписку и подсказки."
              />
            </div>
          ) : detail.error && !ticket ? (
            <ErrorState message={detail.error} onRetry={detail.reload} />
          ) : !ticket ? (
            <div className="space-y-4 p-6">
              <Skeleton className="h-10 w-1/2" />
              <Skeleton className="h-20 w-3/4" />
              <Skeleton className="ml-auto h-20 w-2/3" />
            </div>
          ) : (
            <>
              <header className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
                <button
                  onClick={() => select(null)}
                  className="-ml-1 rounded-control p-2 text-body hover:bg-mist-2 lg:hidden"
                  aria-label="Назад к очереди"
                >
                  <ArrowLeft className="size-5" />
                </button>
                <Avatar name={ticket.customer.name} />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-[15px] font-semibold text-ink">{ticket.subject}</h2>
                  <p className="truncate text-[13px] text-muted">
                    <span className="tnum">{ticket.code}</span>, {ticket.customer.name}
                    {ticket.customer.company ? `, ${ticket.customer.company}` : ''}
                  </p>
                </div>
                <StatusBadge status={ticket.status} className="hidden sm:inline-flex" />
                <Link
                  to={`/tickets?id=${ticket.id}`}
                  className="rounded-control p-2 text-muted transition-colors hover:bg-mist-2 hover:text-ink"
                  aria-label="Открыть карточку обращения"
                  title="Открыть карточку обращения"
                >
                  <ExternalLink className="size-[18px]" />
                </Link>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                <Thread messages={ticket.messages} />
                <div ref={bottomRef} />
              </div>

              <div className="border-t border-line bg-mist/50 px-4 pt-3 pb-4 sm:px-5">
                <div className="mb-2 flex items-center gap-2 text-[13px] font-medium text-body">
                  <BookOpen className="size-4 text-violet-600" aria-hidden />
                  Подходящие статьи из базы знаний
                  {suggestions.data && suggestions.data.length > 0 && (
                    <span className="tnum rounded-full bg-violet-50 px-1.5 py-px text-xs font-semibold text-violet-700">
                      {suggestions.data.length}
                    </span>
                  )}
                </div>
                {suggestions.data && suggestions.data.length > 0 ? (
                  <div className="scroll-x -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
                    {suggestions.data.map((s) => (
                      <SuggestionCard key={s.id} item={s} onInsert={insert} />
                    ))}
                  </div>
                ) : suggestions.loading && !suggestions.data ? (
                  <Skeleton className="h-[4.75rem] w-64" />
                ) : (
                  <p className="rounded-control border border-dashed border-line-strong bg-white px-3.5 py-3 text-[13px] text-body">
                    Подходящих статей не нашлось.{' '}
                    <Link to="/knowledge" className="font-medium text-cobalt-700 hover:underline">
                      Добавьте ответ в базу знаний
                    </Link>
                    , и он появится здесь.
                  </p>
                )}

                <div className="mt-3">
                  <Textarea
                    rows={2}
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
                    className="bg-white"
                  />
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <Button
                      variant="primary"
                      icon={<Send className="size-4" />}
                      disabled={!draft.trim()}
                      loading={sending}
                      onClick={() => void send(false)}
                    >
                      Отправить
                    </Button>
                    <Button
                      icon={<CheckCheck className="size-4" />}
                      disabled={!draft.trim() || sending}
                      onClick={() => void send(true)}
                    >
                      Отправить и решить
                    </Button>
                    {settings?.signature && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDraft((d) => (d ? `${d}\n\n${settings.signature}` : settings.signature))}
                      >
                        Подпись
                      </Button>
                    )}
                    <button
                      type="button"
                      disabled
                      className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-control border border-dashed border-violet-300 bg-violet-50/60 px-3 text-[13px] font-medium text-violet-700 disabled:cursor-not-allowed"
                      title="Генерация ответов подключается на следующем этапе"
                    >
                      <Wand2 className="size-4" aria-hidden />
                      Черновик от AI
                      <span className="rounded-full bg-white px-1.5 py-px text-[11px] font-semibold text-violet-700">Скоро</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </>
  )
}
