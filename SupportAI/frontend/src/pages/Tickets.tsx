import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Inbox, Plus, SearchX } from 'lucide-react'
import { api } from '../api/client'
import type { Priority, Status, TicketQuery } from '../api/types'
import { TicketDrawer } from '../components/TicketDrawer'
import { Button } from '../components/ui/Button'
import { ChannelTag, PriorityMeter, StatusBadge } from '../components/ui/Badges'
import { Select, SearchInput } from '../components/ui/Form'
import { Avatar, EmptyState, ErrorState, PageHeader, Skeleton } from '../components/ui/Misc'
import { useShell } from '../context/ShellContext'
import { useAsync, useDebounced } from '../hooks/useAsync'
import { PRIORITY_META, PRIORITY_ORDER, STATUS_META, STATUS_ORDER } from '../lib/constants'
import { cx, plural, timeAgo } from '../lib/format'

const PAGE_SIZE = 10
type Tab = 'all' | Status
type Sort = NonNullable<TicketQuery['sort']>

export default function Tickets() {
  const { version, refresh, openNewTicket } = useShell()
  const [params, setParams] = useSearchParams()

  const tab = (params.get('status') as Tab | null) ?? 'all'
  const priority = (params.get('priority') as Priority | null) ?? ''
  const sort = (params.get('sort') as Sort | null) ?? 'updated'
  const page = Math.max(1, Number(params.get('page')) || 1)
  const urlQuery = params.get('q') ?? ''
  const openId = Number(params.get('id')) || null

  // Поле поиска меняется сразу, а запрос в адрес и на сервер уходит с небольшой задержкой.
  const [search, setSearch] = useState(urlQuery)
  const debounced = useDebounced(search, 300)
  useEffect(() => setSearch(urlQuery), [urlQuery])

  const update = (changes: Record<string, string | null>, keepPage = false) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        Object.entries(changes).forEach(([key, value]) => {
          if (value === null || value === '' || value === 'all') next.delete(key)
          else next.set(key, value)
        })
        if (!keepPage) next.delete('page')
        return next
      },
      { replace: true },
    )
  }

  useEffect(() => {
    if (debounced.trim() !== urlQuery.trim()) update({ q: debounced.trim() || null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  const { data, error, loading, reload } = useAsync(
    () =>
      api.tickets.list({
        status: tab === 'all' ? '' : tab,
        priority,
        q: urlQuery,
        sort,
        page,
        page_size: PAGE_SIZE,
      }),
    [tab, priority, urlQuery, sort, page, version],
  )

  // Если страниц стало меньше (например, после удаления) — возвращаемся на последнюю.
  useEffect(() => {
    if (data && page > data.pages) update({ page: String(data.pages) }, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.pages])

  const counts = data?.counts
  const tabs: Array<{ value: Tab; label: string; count?: number }> = [
    { value: 'all', label: 'Все', count: counts?.all },
    ...STATUS_ORDER.map((s) => ({ value: s as Tab, label: STATUS_META[s].label, count: counts?.[s] })),
  ]

  const filtered = Boolean(urlQuery || priority || tab !== 'all')
  const from = data && data.total > 0 ? (data.page - 1) * data.page_size + 1 : 0
  const to = data ? Math.min(data.total, data.page * data.page_size) : 0

  const openTicket = (id: number) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('id', String(id))
      return next
    })
  const closeTicket = () =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('id')
        return next
      },
      { replace: true },
    )

  return (
    <>
      <PageHeader
        title="Обращения"
        subtitle="Все запросы клиентов в одном месте: фильтруйте, отвечайте и меняйте статусы."
        actions={
          <Button variant="primary" className="sm:hidden" icon={<Plus className="size-4" />} onClick={openNewTicket}>
            Новое обращение
          </Button>
        }
      />

      <section className="panel overflow-hidden" aria-label="Список обращений">
        <div className="border-b border-line px-3 pt-2 sm:px-5">
          <div className="scroll-x -mb-px flex gap-1 overflow-x-auto" role="tablist" aria-label="Фильтр по статусу">
            {tabs.map((t) => {
              const active = t.value === tab
              return (
                <button
                  key={t.value}
                  role="tab"
                  aria-selected={active}
                  onClick={() => update({ status: t.value })}
                  className={cx(
                    'relative flex h-11 shrink-0 items-center gap-2 px-3 text-sm font-medium transition-colors',
                    active ? 'text-cobalt-700' : 'text-body hover:text-ink',
                  )}
                >
                  {t.label}
                  {t.count !== undefined && (
                    <span
                      className={cx(
                        'tnum rounded-full px-1.5 py-0.5 text-xs',
                        active ? 'bg-cobalt-50 text-cobalt-700' : 'bg-mist-2 text-muted',
                      )}
                    >
                      {t.count}
                    </span>
                  )}
                  <span
                    className={cx(
                      'absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-cobalt-600 transition-opacity duration-200',
                      active ? 'opacity-100' : 'opacity-0',
                    )}
                    aria-hidden
                  />
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-line p-3 sm:flex-row sm:items-center sm:px-5">
          <SearchInput
            className="flex-1"
            value={search}
            onChange={setSearch}
            placeholder="Тема, клиент, компания или номер SA-1010"
          />
          <div className="grid grid-cols-2 gap-3 sm:flex">
            <Select
              aria-label="Фильтр по приоритету"
              value={priority}
              onChange={(e) => update({ priority: e.target.value })}
              className="sm:w-48"
            >
              <option value="">Любой приоритет</option>
              {PRIORITY_ORDER.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_META[p].label}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Сортировка"
              value={sort}
              onChange={(e) => update({ sort: e.target.value === 'updated' ? null : e.target.value })}
              className="sm:w-56"
            >
              <option value="updated">Недавно обновлённые</option>
              <option value="newest">Сначала новые</option>
              <option value="oldest">Сначала старые</option>
              <option value="priority">По приоритету</option>
            </Select>
          </div>
        </div>

        {error && !data ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !data ? (
          <div className="space-y-px p-3" aria-busy={loading}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : data.items.length === 0 ? (
          filtered ? (
            <EmptyState
              icon={<SearchX className="size-5" />}
              title="Ничего не найдено"
              text="Попробуйте изменить запрос или сбросить фильтры."
              action={
                <Button onClick={() => setParams({}, { replace: true })}>Сбросить фильтры</Button>
              }
            />
          ) : (
            <EmptyState
              icon={<Inbox className="size-5" />}
              title="Обращений пока нет"
              text="Когда клиент напишет в поддержку, обращение появится здесь."
              action={
                <Button variant="primary" icon={<Plus className="size-4" />} onClick={openNewTicket}>
                  Создать обращение
                </Button>
              }
            />
          )
        ) : (
          <div className={cx('transition-opacity duration-150', loading && 'opacity-60')}>
            <table className="w-full text-left">
              <thead className="hidden border-b border-line bg-mist/60 text-[13px] text-muted md:table-header-group">
                <tr>
                  <th className="py-2.5 pr-3 pl-5 font-medium">Обращение</th>
                  <th className="px-3 py-2.5 font-medium">Статус</th>
                  <th className="px-3 py-2.5 font-medium">Приоритет</th>
                  <th className="hidden px-3 py-2.5 font-medium xl:table-cell">Канал</th>
                  <th className="hidden px-3 py-2.5 font-medium lg:table-cell">Исполнитель</th>
                  <th className="py-2.5 pr-5 pl-3 text-right font-medium">Обновлено</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.items.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => openTicket(ticket.id)}
                    className={cx(
                      'group cursor-pointer transition-colors hover:bg-mist/70',
                      openId === ticket.id && 'bg-cobalt-50/50',
                    )}
                  >
                    <td className="py-3.5 pr-3 pl-4 sm:pl-5">
                      <div className="flex items-center gap-3.5">
                        <Avatar name={ticket.customer.name} />
                        <div className="min-w-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              openTicket(ticket.id)
                            }}
                            className="block max-w-full truncate text-left text-sm font-medium text-ink group-hover:text-cobalt-700"
                          >
                            {ticket.subject}
                          </button>
                          <p className="truncate text-[13px] text-muted">
                            <span className="tnum">{ticket.code}</span>, {ticket.customer.name}
                            {ticket.customer.company ? `, ${ticket.customer.company}` : ''}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 md:hidden">
                            <StatusBadge status={ticket.status} />
                            <PriorityMeter priority={ticket.priority} />
                            <span className="text-xs text-muted">{timeAgo(ticket.updated_at)}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-3 py-3.5 md:table-cell">
                      <StatusBadge status={ticket.status} />
                    </td>
                    <td className="hidden px-3 py-3.5 md:table-cell">
                      <PriorityMeter priority={ticket.priority} />
                    </td>
                    <td className="hidden px-3 py-3.5 xl:table-cell">
                      <ChannelTag channel={ticket.channel} />
                    </td>
                    <td className="hidden px-3 py-3.5 text-[13px] text-body lg:table-cell">
                      {ticket.assignee ?? <span className="text-muted">Не назначен</span>}
                    </td>
                    <td className="hidden py-3.5 pr-5 pl-3 text-right text-[13px] whitespace-nowrap text-muted md:table-cell">
                      {timeAgo(ticket.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-5">
              <p className="tnum text-[13px] text-muted">
                {from}–{to} из {data.total} {plural(data.total, ['обращения', 'обращений', 'обращений'])}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  icon={<ChevronLeft className="size-4" />}
                  disabled={data.page <= 1}
                  onClick={() => update({ page: String(data.page - 1) }, true)}
                  aria-label="Предыдущая страница"
                />
                <span className="tnum min-w-20 text-center text-[13px] text-body">
                  Стр. {data.page} из {data.pages}
                </span>
                <Button
                  size="sm"
                  icon={<ChevronRight className="size-4" />}
                  disabled={data.page >= data.pages}
                  onClick={() => update({ page: String(data.page + 1) }, true)}
                  aria-label="Следующая страница"
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {openId && <TicketDrawer ticketId={openId} onClose={closeTicket} onChanged={refresh} />}
    </>
  )
}
