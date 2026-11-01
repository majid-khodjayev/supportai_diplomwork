import { NavLink, Link } from 'react-router-dom'
import {
  BookOpen,
  CreditCard,
  Inbox,
  LayoutDashboard,
  Settings as SettingsIcon,
  Sparkles,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useShell } from '../../context/ShellContext'
import { cx, formatNumber } from '../../lib/format'
import { Meter } from '../ui/Misc'
import { Logo } from './Logo'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  badge?: number
}

function NavGroup({ title, items }: { title: string; items: NavItem[] }) {
  return (
    <div>
      <p className="mb-1.5 px-3 text-xs font-medium text-muted">{title}</p>
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cx(
                  'group relative flex h-10 items-center gap-3 rounded-control px-3 text-[14px] font-medium transition-colors duration-150',
                  isActive
                    ? 'bg-cobalt-50 text-cobalt-700 shadow-[inset_0_0_0_1px_rgb(192_203_250/0.55)]'
                    : 'text-body hover:bg-mist hover:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cx(
                      'absolute top-2.5 bottom-2.5 -left-4 w-[3px] rounded-r-full bg-cobalt-600 transition-opacity duration-200',
                      isActive ? 'opacity-100' : 'opacity-0',
                    )}
                    aria-hidden
                  />
                  <item.icon
                    className={cx('size-[18px]', isActive ? 'text-cobalt-600' : 'text-muted group-hover:text-body')}
                    aria-hidden
                  />
                  <span className="flex-1">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={cx(
                        'tnum min-w-6 rounded-full px-1.5 py-0.5 text-center text-xs font-semibold',
                        isActive ? 'bg-white text-cobalt-700' : 'bg-mist-2 text-body',
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  )
}

function PlanCard() {
  const { plans } = useShell()
  if (!plans) return null
  const plan = plans.plans.find((p) => p.id === plans.current_plan)
  if (!plan) return null
  const limit = plan.ticket_limit

  return (
    <Link
      to="/plans"
      className="block rounded-panel border border-violet-100 bg-violet-50/50 p-3.5 transition-colors hover:border-violet-200 hover:bg-violet-50"
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-ink">Тариф «{plan.name}»</span>
        <Sparkles className="size-4 text-violet-500" aria-hidden />
      </div>
      {limit ? (
        <>
          <Meter
            className="mt-3"
            value={plans.tickets_used_30d}
            max={limit}
            label="Использовано обращений за 30 дней"
            barClassName={plans.tickets_used_30d / limit > 0.85 ? 'bg-warn-500' : 'bg-cobalt-600'}
          />
          <p className="tnum mt-2 text-xs text-muted">
            {formatNumber(plans.tickets_used_30d)} из {formatNumber(limit)} обращений за 30 дней
          </p>
        </>
      ) : (
        <p className="mt-2 text-xs text-muted">Без ограничений по обращениям</p>
      )}
      <p className="mt-2.5 text-xs font-medium text-cobalt-700">Сменить тариф</p>
    </Link>
  )
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { totals } = useShell()

  const work: NavItem[] = [
    { to: '/', label: 'Дашборд', icon: LayoutDashboard, end: true },
    { to: '/tickets', label: 'Обращения', icon: Inbox, badge: totals?.active },
    { to: '/assistant', label: 'AI-помощник', icon: Sparkles },
  ]
  const company: NavItem[] = [
    { to: '/knowledge', label: 'База знаний', icon: BookOpen },
    { to: '/plans', label: 'Тарифы', icon: CreditCard },
    { to: '/settings', label: 'Настройки', icon: SettingsIcon },
  ]

  return (
    <>
      <div
        className={cx(
          'fixed inset-0 z-40 bg-ink/35 transition-opacity duration-300 lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-50 flex w-[17rem] flex-col border-r border-line bg-white px-4 pt-5 pb-4 transition-transform duration-300 ease-quint',
          'lg:sticky lg:top-0 lg:z-auto lg:h-dvh lg:translate-x-0 lg:transition-none',
          open ? 'translate-x-0 shadow-float' : '-translate-x-full',
        )}
        aria-label="Основная навигация"
      >
        <div className="mb-8 flex items-center justify-between px-1">
          <Logo />
          <button
            onClick={onClose}
            className="rounded-control p-2 text-muted hover:bg-mist-2 hover:text-ink lg:hidden"
            aria-label="Закрыть меню"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto pl-4 -ml-4 pr-0.5">
          <NavGroup title="Работа" items={work} />
          <NavGroup title="Компания" items={company} />
        </nav>

        <div className="pt-4">
          <PlanCard />
        </div>
      </aside>
    </>
  )
}
