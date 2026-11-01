import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Inbox, Plus, Star } from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '../api/client'
import type { StatsOverview } from '../api/types'
import { CHART, ChartTooltip, Sparkline, TrendChip } from '../components/charts'
import { Button } from '../components/ui/Button'
import { PriorityMeter, StatusBadge } from '../components/ui/Badges'
import { Avatar, EmptyState, ErrorState, Meter, Segmented, Skeleton } from '../components/ui/Misc'
import { useShell } from '../context/ShellContext'
import { useAsync, useCountUp } from '../hooks/useAsync'
import {
  CHANNEL_LABEL,
  PRIORITY_META,
  PRIORITY_ORDER,
  STATUS_META,
  STATUS_ORDER,
} from '../lib/constants'
import {
  cx,
  formatHours,
  formatLongDate,
  formatNumber,
  formatShortDate,
  plural,
  timeAgo,
} from '../lib/format'
import type { Channel, Priority, Status } from '../api/types'

type Period = '7' | '14' | '30'

// ---------------------------------------------------------------- показатель
function Kpi({
  label,
  value,
  digits = 0,
  text,
  note,
  trend,
  spark,
  sparkColor,
  className,
}: {
  label: string
  value?: number
  digits?: number
  text?: string
  note?: ReactNode
  trend?: ReactNode
  spark?: number[]
  sparkColor?: string
  className?: string
}) {
  const counted = useCountUp(value ?? 0)
  return (
    <div className={cx('flex flex-col justify-between gap-4 p-5 transition-colors duration-200 hover:bg-mist/40 sm:p-6', className)}>
      <div>
        <p className="text-[13px] font-medium text-body">{label}</p>
        <div className="mt-2.5 flex items-end justify-between gap-3">
          <p className="tnum font-display text-[2.5rem] leading-none font-semibold tracking-tight text-ink">
            {text ?? formatNumber(counted, digits)}
          </p>
          {spark && <Sparkline values={spark} color={sparkColor} className="mb-0.5 hidden shrink-0 sm:block" />}
        </div>
      </div>
      <div className="min-h-5">{trend ?? note}</div>
    </div>
  )
}

// ---------------------------------------------------------------- динамика
function DynamicsPanel({ data, period, onPeriod }: { data: StatsOverview; period: Period; onPeriod: (p: Period) => void }) {
  const [view, setView] = useState<'chart' | 'table'>('chart')
  const rows = useMemo(
    () => data.series.map((point) => ({ ...point, label: formatShortDate(point.date) })),
    [data.series],
  )
  const totalCreated = rows.reduce((sum, r) => sum + r.created, 0)
  const totalResolved = rows.reduce((sum, r) => sum + r.resolved, 0)

  return (
    <section className="panel flex flex-col p-5 sm:p-6" aria-labelledby="dyn-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="dyn-title" className="font-display text-xl font-semibold tracking-tight">
            Динамика обращений
          </h2>
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-body">
            <li className="flex items-center gap-2">
              <span className="h-0.5 w-4 rounded-full" style={{ background: CHART.created }} aria-hidden />
              Поступило: <b className="tnum font-semibold text-ink">{totalCreated}</b>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-0.5 w-4 rounded-full" style={{ background: CHART.resolved }} aria-hidden />
              Решено: <b className="tnum font-semibold text-ink">{totalResolved}</b>
            </li>
          </ul>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented<'chart' | 'table'>
            label="Вид"
            size="sm"
            value={view}
            onChange={setView}
            options={[
              { value: 'chart', label: 'График' },
              { value: 'table', label: 'Таблица' },
            ]}
          />
          <Segmented<Period>
            label="Период"
            size="sm"
            value={period}
            onChange={onPeriod}
            options={[
              { value: '7', label: '7 дней' },
              { value: '14', label: '14 дней' },
              { value: '30', label: '30 дней' },
            ]}
          />
        </div>
      </div>

      {view === 'chart' ? (
        <div className="mt-5 h-72 w-full min-w-0 xl:h-[22.75rem]" role="img" aria-label="График: поступившие и решённые обращения по дням">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="fillCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.created} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={CHART.created} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fillResolved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.resolved} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={CHART.resolved} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={CHART.grid} strokeDasharray="3 5" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: CHART.tick, fontSize: 12 }}
                interval="preserveStartEnd"
                minTickGap={28}
                tickMargin={10}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={44}
                tick={{ fill: CHART.tick, fontSize: 12 }}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: CHART.cursor, strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="created"
                name="Поступило"
                stroke={CHART.created}
                strokeWidth={2}
                fill="url(#fillCreated)"
                dot={false}
                activeDot={{ r: 4.5, stroke: '#fff', strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="resolved"
                name="Решено"
                stroke={CHART.resolved}
                strokeWidth={2}
                fill="url(#fillResolved)"
                dot={false}
                activeDot={{ r: 4.5, stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mt-5 max-h-72 overflow-auto rounded-control border border-line">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-mist text-[13px] text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Дата</th>
                <th className="px-4 py-2 text-right font-medium">Поступило</th>
                <th className="px-4 py-2 text-right font-medium">Решено</th>
                <th className="px-4 py-2 text-right font-medium">В работе на конец дня</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[...rows].reverse().map((r) => (
                <tr key={r.date}>
                  <td className="px-4 py-2 text-body">{r.label}</td>
                  <td className="tnum px-4 py-2 text-right">{r.created}</td>
                  <td className="tnum px-4 py-2 text-right">{r.resolved}</td>
                  <td className="tnum px-4 py-2 text-right">{r.backlog}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

// ---------------------------------------------------------------- статусы и приоритеты
function BreakdownPanel({ data }: { data: StatsOverview }) {
  const statusCount = (s: Status) => data.by_status.find((i) => i.key === s)?.count ?? 0
  const total = data.totals.total || 1
  const priorities = PRIORITY_ORDER.map((p) => ({
    key: p,
    count: data.by_priority_active.find((i) => i.key === p)?.count ?? 0,
  }))
  const maxPriority = Math.max(...priorities.map((p) => p.count), 1)

  return (
    <section className="panel flex flex-col p-5 sm:p-6" aria-labelledby="split-title">
      <h2 id="split-title" className="font-display text-xl font-semibold tracking-tight">
        Статусы
      </h2>

      <div className="mt-4 flex h-2.5 gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Распределение обращений по статусам">
        {STATUS_ORDER.map((status) => {
          const count = statusCount(status)
          return count > 0 ? (
            <div
              key={status}
              className={cx('h-full first:rounded-l-full last:rounded-r-full', STATUS_META[status].bar)}
              style={{ width: `${(count / total) * 100}%` }}
              title={`${STATUS_META[status].label}: ${count}`}
            />
          ) : null
        })}
      </div>
      <ul className="mt-4 space-y-2.5">
        {STATUS_ORDER.map((status) => {
          const count = statusCount(status)
          return (
            <li key={status} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2.5 text-body">
                <span className={cx('size-2.5 rounded-full', STATUS_META[status].dot)} aria-hidden />
                {STATUS_META[status].label}
              </span>
              <span className="flex items-baseline gap-2">
                <b className="tnum font-semibold text-ink">{count}</b>
                <span className="tnum w-10 text-right text-xs text-muted">{Math.round((count / total) * 100)} %</span>
              </span>
            </li>
          )
        })}
      </ul>

      <h3 className="mt-7 mb-3.5 border-t border-line pt-6 font-display text-lg font-semibold tracking-tight">
        Приоритет активных
      </h3>
      <ul className="space-y-3">
        {priorities.map(({ key, count }) => (
          <li key={key}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <PriorityMeter priority={key as Priority} />
              <b className="tnum font-semibold text-ink">{count}</b>
            </div>
            <Meter value={count} max={maxPriority} label={PRIORITY_META[key as Priority].label} barClassName={PRIORITY_META[key as Priority].bar} />
          </li>
        ))}
      </ul>
    </section>
  )
}

// ---------------------------------------------------------------- последние обращения
function RecentPanel() {
  const { version } = useShell()
  const navigate = useNavigate()
  const { data, error, loading, reload } = useAsync(
    () => api.tickets.list({ page_size: 6, sort: 'updated' }),
    [version],
  )

  return (
    <section className="panel overflow-hidden" aria-labelledby="recent-title">
      <div className="flex items-center justify-between px-5 pt-5 pb-3 sm:px-6 sm:pt-6">
        <h2 id="recent-title" className="font-display text-xl font-semibold tracking-tight">
          Последние обращения
        </h2>
        <Link to="/tickets" className="rounded-md px-2 py-1 text-[13px] font-medium text-cobalt-700 transition-colors hover:bg-cobalt-50">
          Все обращения
        </Link>
      </div>

      {error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading && !data ? (
        <div className="space-y-3 px-6 pb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : data && data.items.length === 0 ? (
        <EmptyState icon={<Inbox className="size-5" />} title="Пока нет обращений" text="Создайте первое обращение, и оно появится здесь." />
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {data?.items.map((ticket) => (
            <li key={ticket.id}>
              <button
                onClick={() => navigate(`/tickets?id=${ticket.id}`)}
                className="flex w-full items-center gap-3.5 px-5 py-3.5 text-left transition-colors hover:bg-mist/70 sm:px-6"
              >
                <Avatar name={ticket.customer.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{ticket.subject}</span>
                  <span className="block truncate text-[13px] text-muted">
                    {ticket.customer.name}
                    {ticket.customer.company ? `, ${ticket.customer.company}` : ''}
                  </span>
                </span>
                <span className="hidden sm:block">
                  <PriorityMeter priority={ticket.priority} showLabel={false} />
                </span>
                <span className="flex flex-col items-end gap-1">
                  <StatusBadge status={ticket.status} />
                  <span className="text-xs text-muted">{timeAgo(ticket.updated_at)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ---------------------------------------------------------------- качество и каналы
function QualityPanel({ data }: { data: StatsOverview }) {
  const channels = data.by_channel.map((c) => ({
    name: CHANNEL_LABEL[c.key as Channel] ?? c.key,
    count: c.count,
  }))
  const rating = data.csat

  return (
    <section className="panel p-5 sm:p-6" aria-labelledby="quality-title">
      <h2 id="quality-title" className="font-display text-xl font-semibold tracking-tight">
        Качество поддержки
      </h2>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <p className="tnum font-display text-[2.5rem] leading-none font-semibold tracking-tight">
            {rating !== null ? formatNumber(rating, 1) : '—'}
            <span className="ml-1 font-sans text-base font-normal text-muted">из 5</span>
          </p>
          <p className="mt-2 text-[13px] text-muted">
            Оценок: {data.csat_count}
          </p>
        </div>
        <div className="flex gap-0.5 pb-1" role="img" aria-label={rating !== null ? `Оценка ${formatNumber(rating, 1)} из 5` : 'Оценок пока нет'}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className={cx('size-[18px]', rating !== null && n <= Math.round(rating) ? 'fill-violet-500 text-violet-500' : 'text-line-strong')}
              aria-hidden
            />
          ))}
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-1.5 flex items-center justify-between text-[13px]">
          <span className="text-body">Доля решённых</span>
          <b className="tnum font-semibold text-ink">{formatNumber(data.totals.resolution_rate, 1)} %</b>
        </div>
        <Meter value={data.totals.resolved} max={data.totals.total} label="Доля решённых обращений" barClassName="bg-violet-500" />
      </div>

      <h3 className="mt-7 mb-2 border-t border-line pt-6 text-[13px] font-medium text-body">Откуда приходят обращения</h3>
      <div className="h-40 w-full" role="img" aria-label="Диаграмма: обращения по каналам">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={channels} margin={{ top: 8, right: 4, left: -28, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke={CHART.grid} strokeDasharray="3 5" />
            <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: CHART.tick, fontSize: 12 }} tickMargin={8} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: CHART.tick, fontSize: 12 }} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: '#eef1fe' }} />
            <Bar dataKey="count" name="Обращений" fill={CHART.created} radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------- страница
export default function Dashboard() {
  const { version, openNewTicket } = useShell()
  const [period, setPeriod] = useState<Period>('14')
  const { data, error, loading, reload } = useAsync(() => api.stats.overview(Number(period)), [period, version])

  if (error && !data) {
    return (
      <div className="panel">
        <ErrorState message={error} onRetry={reload} />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6" aria-busy={loading} aria-label="Загрузка дашборда">
        <div className="space-y-3">
          <Skeleton className="h-9 max-w-xl" />
          <Skeleton className="h-9 max-w-sm" />
          <Skeleton className="h-4 max-w-md" />
        </div>
        <div className="panel grid grid-cols-2 overflow-hidden lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-4 p-5 sm:p-6">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-5 w-32" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="panel space-y-5 p-6 xl:col-span-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-64" />
          </div>
          <div className="panel space-y-4 p-6">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-2.5" />
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-5" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const { totals, trends, series } = data
  const urgent = totals.urgent_active

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <h1 className="font-display text-[2rem] leading-[1.15] font-semibold tracking-tight text-balance sm:text-[2.5rem]">
            В работе {totals.active} {plural(totals.active, ['обращение', 'обращения', 'обращений'])}
            {urgent > 0
              ? `, из них ${urgent} ${plural(urgent, ['срочное', 'срочных', 'срочных'])}.`
              : '. Срочных нет.'}
          </h1>
          <p className="mt-3 text-[15px] text-body">
            {formatLongDate()}. Решено {formatNumber(totals.resolution_rate, 0)} % обращений
            {data.csat !== null ? `, средняя оценка клиентов ${formatNumber(data.csat, 1)} из 5.` : '.'}
          </p>
        </div>
        <Button variant="secondary" className="sm:hidden" icon={<Plus className="size-4" />} onClick={openNewTicket}>
          Новое обращение
        </Button>
      </header>

      <section className="panel grid grid-cols-2 overflow-hidden lg:grid-cols-4 [&>*]:border-line max-lg:[&>:nth-child(even)]:border-l max-lg:[&>:nth-child(n+3)]:border-t lg:[&>:not(:first-child)]:border-l" aria-label="Ключевые показатели">
        <Kpi
          label="Всего обращений"
          value={totals.total}
          spark={series.map((p) => p.created)}
          trend={<TrendChip pct={trends.created.change_pct} goodWhen="neutral" suffix="к прошлой неделе" />}
        />
        <Kpi
          label="Активные"
          value={totals.active}
          spark={series.map((p) => p.backlog)}
          sparkColor={CHART.created}
          trend={<TrendChip pct={trends.active.change_pct} goodWhen="down" suffix="за неделю" />}
        />
        <Kpi
          label="Решённые"
          value={totals.resolved}
          spark={series.map((p) => p.resolved)}
          sparkColor={CHART.resolved}
          trend={<TrendChip pct={trends.resolved.change_pct} goodWhen="up" suffix="к прошлой неделе" />}
        />
        <Kpi
          label="Среднее время решения"
          text={formatHours(data.avg_resolution_hours)}
          note={<span className="text-xs text-muted">По {totals.resolved} решённым обращениям</span>}
        />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2 [&>section]:h-full">
          <DynamicsPanel data={data} period={period} onPeriod={setPeriod} />
        </div>
        <BreakdownPanel data={data} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2 [&>section]:h-full">
          <RecentPanel />
        </div>
        <QualityPanel data={data} />
      </div>
    </div>
  )
}
