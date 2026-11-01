import { useState } from 'react'
import { Check, Info, Users } from 'lucide-react'
import { api, ApiError } from '../api/client'
import type { BillingPeriod, Plan, PlanId } from '../api/types'
import { Button } from '../components/ui/Button'
import { ErrorState, Meter, PageHeader, Segmented, Skeleton } from '../components/ui/Misc'
import { useShell } from '../context/ShellContext'
import { useToast } from '../context/ToastContext'
import { useAsync } from '../hooks/useAsync'
import { cx, formatNumber, plural } from '../lib/format'

function PlanCard({
  plan,
  period,
  current,
  busy,
  onSelect,
}: {
  plan: Plan
  period: BillingPeriod
  current: boolean
  busy: boolean
  onSelect: () => void
}) {
  const price = period === 'yearly' ? plan.price_yearly : plan.price_monthly
  const featured = plan.popular

  return (
    <article
      className={cx(
        'relative flex flex-col rounded-panel border bg-white p-6 transition-[border-color,box-shadow,translate] duration-300 ease-quint hover:-translate-y-0.5 sm:p-7',
        featured
          ? 'border-cobalt-600 shadow-[0_0_0_1px_var(--color-cobalt-600),0_20px_40px_-20px_rgb(42_68_212/0.35)] hover:shadow-[0_0_0_1px_var(--color-cobalt-600),0_28px_48px_-20px_rgb(42_68_212/0.45)]'
          : 'border-line hover:border-line-strong hover:shadow-lift',
      )}
      aria-labelledby={`plan-${plan.id}`}
    >
      {featured && (
        <span className="absolute -top-3 left-6 rounded-full bg-cobalt-600 px-3 py-1 text-xs font-semibold text-white">
          Выбирают чаще всего
        </span>
      )}

      <div className="flex items-start justify-between gap-3">
        <h2 id={`plan-${plan.id}`} className="font-display text-2xl font-semibold tracking-tight">
          {plan.name}
        </h2>
        {current && (
          <span className="rounded-full bg-ok-50 px-2.5 py-1 text-xs font-semibold text-ok-700">Ваш тариф</span>
        )}
      </div>
      <p className="mt-1.5 min-h-10 text-sm text-body">{plan.tagline}</p>

      <p className="mt-6 flex items-baseline gap-1.5">
        <span className="tnum font-display text-[3rem] leading-none font-semibold tracking-tight">
          {`$${price}`}
        </span>
        <span className="text-sm text-muted">{price === 0 ? 'навсегда' : 'в месяц'}</span>
      </p>
      <p className="mt-1.5 h-5 text-[13px] text-muted">
        {price > 0 && period === 'yearly' && `$${price * 12} в год, экономия $${(plan.price_monthly - price) * 12}`}
        {price > 0 && period === 'monthly' && 'Оплата каждый месяц'}
      </p>

      <Button
        className="mt-5 w-full"
        size="md"
        variant={featured && !current ? 'primary' : 'secondary'}
        disabled={current}
        loading={busy}
        onClick={onSelect}
      >
        {current ? 'Текущий тариф' : 'Перейти на этот тариф'}
      </Button>

      <ul className="mt-6 space-y-3 border-t border-line pt-6">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-[14px] text-ink">
            <span
              className={cx(
                'mt-px grid size-5 shrink-0 place-items-center rounded-full',
                featured ? 'bg-cobalt-50 text-cobalt-600' : 'bg-violet-50 text-violet-600',
              )}
              aria-hidden
            >
              <Check className="size-3" strokeWidth={3} />
            </span>
            {feature}
          </li>
        ))}
      </ul>
    </article>
  )
}

export default function Plans() {
  const { refresh, version } = useShell()
  const toast = useToast()
  const { data, error, reload } = useAsync(() => api.plans.get(), [version])
  const [period, setPeriod] = useState<BillingPeriod | null>(null)
  const [busy, setBusy] = useState<PlanId | null>(null)

  const effectivePeriod = period ?? data?.billing_period ?? 'monthly'

  const select = async (plan: Plan) => {
    setBusy(plan.id)
    try {
      await api.plans.select(plan.id, effectivePeriod)
      toast.success(`Тариф «${plan.name}» подключён`)
      refresh()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Не удалось сменить тариф')
    } finally {
      setBusy(null)
    }
  }

  if (error && !data) {
    return (
      <div className="panel">
        <ErrorState message={error} onRetry={reload} />
      </div>
    )
  }

  const current = data?.plans.find((p) => p.id === data.current_plan)

  return (
    <>
      <PageHeader
        title="Тарифы"
        subtitle="Выберите план под размер вашей команды. Перейти на другой тариф можно в любой момент."
        actions={
          <Segmented<BillingPeriod>
            label="Период оплаты"
            value={effectivePeriod}
            onChange={setPeriod}
            options={[
              { value: 'monthly', label: 'Помесячно' },
              { value: 'yearly', label: 'За год, скидка 20 %' },
            ]}
          />
        }
      />

      {current && data && (
        <section className="panel mb-8 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6" aria-label="Использование тарифа">
          <div>
            <p className="text-[13px] text-muted">Сейчас подключён</p>
            <p className="font-display text-xl font-semibold tracking-tight">Тариф «{current.name}»</p>
          </div>
          <div className="w-full sm:max-w-sm">
            {current.ticket_limit ? (
              <>
                <div className="mb-2 flex items-baseline justify-between text-[13px]">
                  <span className="text-body">Обращений за 30 дней</span>
                  <span className="tnum font-semibold text-ink">
                    {formatNumber(data.tickets_used_30d)} из {formatNumber(current.ticket_limit)}
                  </span>
                </div>
                <Meter
                  value={data.tickets_used_30d}
                  max={current.ticket_limit}
                  label="Использовано обращений"
                  barClassName={data.tickets_used_30d / current.ticket_limit > 0.85 ? 'bg-warn-500' : 'bg-cobalt-600'}
                />
              </>
            ) : (
              <p className="text-sm text-body">
                Обращений за 30 дней: <b className="tnum">{formatNumber(data.tickets_used_30d)}</b>, ограничений нет
              </p>
            )}
          </div>
          <p className="flex items-center gap-2 text-[13px] text-body sm:border-l sm:border-line sm:pl-6">
            <Users className="size-4 text-muted" aria-hidden />
            {current.seats ? `${current.seats} ${plural(current.seats, ['оператор', 'оператора', 'операторов'])}` : 'Без лимита операторов'}
          </p>
        </section>
      )}

      {!data ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[34rem]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 items-stretch gap-6 pt-3 lg:grid-cols-3">
          {data.plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              period={effectivePeriod}
              current={plan.id === data.current_plan && effectivePeriod === data.billing_period}
              busy={busy === plan.id}
              onSelect={() => void select(plan)}
            />
          ))}
        </div>
      )}

      <p className="mt-8 flex items-start gap-2.5 rounded-control bg-cobalt-50/70 px-4 py-3 text-[13px] text-cobalt-800">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        Приём оплаты подключим на следующем этапе. Сейчас тариф переключается сразу и без списаний.
      </p>
    </>
  )
}
