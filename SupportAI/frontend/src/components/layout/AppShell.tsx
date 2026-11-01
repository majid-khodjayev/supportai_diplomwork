import { useCallback, useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { ShellContext, type ShellValue } from '../../context/ShellContext'
import { PAGE_TITLES } from '../../lib/constants'
import { useAsync } from '../../hooks/useAsync'
import { NewTicketModal } from '../NewTicketModal'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const [version, setVersion] = useState(0)

  const refresh = useCallback(() => setVersion((v) => v + 1), [])

  const settings = useAsync(() => api.settings.get(), [version])
  const plans = useAsync(() => api.plans.get(), [version])
  const stats = useAsync(() => api.stats.overview(14), [version])

  // Закрываем мобильное меню при переходе на другую страницу и меняем заголовок вкладки.
  useEffect(() => {
    setMenuOpen(false)
    const title = PAGE_TITLES[location.pathname] ?? 'SupportAI'
    document.title = `${title} — SupportAI`
  }, [location.pathname])

  const value = useMemo<ShellValue>(
    () => ({
      settings: settings.data,
      plans: plans.data,
      totals: stats.data?.totals ?? null,
      version,
      refresh,
      openNewTicket: () => setNewOpen(true),
      openMenu: () => setMenuOpen(true),
    }),
    [settings.data, plans.data, stats.data, version, refresh],
  )

  return (
    <ShellContext.Provider value={value}>
      <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
        <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
        <div className="flex min-w-0 flex-col">
          <Topbar />
          <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
            {/* Одна мягкая анимация при смене страницы */}
            <div key={location.pathname} className="page-enter">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      {newOpen && (
        <NewTicketModal
          onClose={() => setNewOpen(false)}
          onCreated={(id) => {
            setNewOpen(false)
            refresh()
            navigate(`/tickets?id=${id}`)
          }}
        />
      )}
    </ShellContext.Provider>
  )
}
