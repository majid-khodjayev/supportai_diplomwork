import { createContext, useContext } from 'react'
import type { PlansInfo, Settings, StatsOverview } from '../api/types'

/**
 * Общие данные «оболочки» приложения: настройки, тариф, число активных обращений.
 * Страницы берут их через useShell(). После любого изменения данных вызывайте refresh() —
 * счётчики в боковой панели и списки на страницах обновятся.
 */
export interface ShellValue {
  settings: Settings | null
  plans: PlansInfo | null
  totals: StatsOverview['totals'] | null
  version: number
  refresh: () => void
  openNewTicket: () => void
  openMenu: () => void
}

export const ShellContext = createContext<ShellValue | null>(null)

export function useShell(): ShellValue {
  const ctx = useContext(ShellContext)
  if (!ctx) throw new Error('useShell нужно вызывать внутри AppShell')
  return ctx
}
