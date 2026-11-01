import { Link, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { Button } from './components/ui/Button'
import { EmptyState } from './components/ui/Misc'
import { Compass } from 'lucide-react'
import Assistant from './pages/Assistant'
import Dashboard from './pages/Dashboard'
import Knowledge from './pages/Knowledge'
import Plans from './pages/Plans'
import Settings from './pages/Settings'
import Tickets from './pages/Tickets'

function NotFound() {
  return (
    <div className="panel">
      <EmptyState
        icon={<Compass className="size-5" />}
        title="Такой страницы нет"
        text="Возможно, ссылка устарела. Вернитесь на дашборд и продолжайте работу."
        action={
          <Link to="/">
            <Button variant="primary">На дашборд</Button>
          </Link>
        }
      />
    </div>
  )
}

// Маршруты (адреса страниц). Новая страница = новый <Route> + пункт в components/layout/Sidebar.tsx.
export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="tickets" element={<Tickets />} />
        <Route path="assistant" element={<Assistant />} />
        <Route path="knowledge" element={<Knowledge />} />
        <Route path="plans" element={<Plans />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
