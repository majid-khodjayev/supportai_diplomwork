import { useEffect, useState, type FormEvent } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Menu, Plus, Search } from 'lucide-react'
import { useShell } from '../../context/ShellContext'
import { Avatar } from '../ui/Misc'
import { Button } from '../ui/Button'

export function Topbar() {
  const { settings, openMenu, openNewTicket } = useShell()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const [text, setText] = useState('')

  // Когда пользователь на странице обращений, поле поиска показывает текущий запрос.
  useEffect(() => {
    setText(location.pathname === '/tickets' ? (params.get('q') ?? '') : '')
  }, [location.pathname, params])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const q = text.trim()
    navigate(q ? `/tickets?q=${encodeURIComponent(q)}` : '/tickets')
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center gap-3 px-4 sm:px-6 lg:px-10">
        <button
          onClick={openMenu}
          className="-ml-2 rounded-control p-2 text-body transition-colors hover:bg-mist-2 hover:text-ink lg:hidden"
          aria-label="Открыть меню"
        >
          <Menu className="size-5" />
        </button>

        <form onSubmit={submit} role="search" className="relative min-w-0 max-w-md flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            type="search"
            placeholder="Найти обращение или клиента"
            aria-label="Поиск по обращениям"
            className="h-10 w-full rounded-full border border-line bg-mist/80 pr-4 pl-10 text-sm text-ink transition-[border-color,background-color,box-shadow] duration-150 placeholder:text-muted/80 hover:border-line-strong focus:border-cobalt-500 focus:bg-white focus:shadow-[0_0_0_3px_rgb(70_96_226/0.16)] focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
        </form>

        <div className="ml-auto flex items-center gap-3">
          <Button
            variant="primary"
            icon={<Plus className="size-4" />}
            onClick={openNewTicket}
            aria-label="Новое обращение"
          >
            <span className="hidden sm:inline">Новое обращение</span>
          </Button>
          {settings && (
            <div className="hidden items-center gap-2.5 border-l border-line pl-4 md:flex">
              <Avatar name={settings.operator_name} />
              <div className="leading-tight">
                <p className="max-w-40 truncate text-[13px] font-medium text-ink">{settings.operator_name}</p>
                <p className="max-w-40 truncate text-xs text-muted">{settings.company_name}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
