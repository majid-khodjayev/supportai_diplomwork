import { Fragment, useState, type FormEvent } from 'react'
import { BookOpen, Check, ChevronDown, Copy, Pencil, Plus, SearchX, Trash2 } from 'lucide-react'
import { api, ApiError } from '../api/client'
import type { Article, ArticleInput } from '../api/types'
import { Button } from '../components/ui/Button'
import { Tag } from '../components/ui/Badges'
import { Field, FormError, Input, Select, SearchInput, Textarea } from '../components/ui/Form'
import { Modal } from '../components/ui/Overlay'
import { EmptyState, ErrorState, PageHeader, Skeleton } from '../components/ui/Misc'
import { useToast } from '../context/ToastContext'
import { useAsync, useDebounced } from '../hooks/useAsync'
import { CATEGORIES } from '../lib/constants'
import { cx, plural } from '../lib/format'

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Подсвечивает найденные слова в тексте. */
function Highlight({ text, query }: { text: string; query: string }) {
  const words = query
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1)
  if (words.length === 0) return <>{text}</>
  const parts = text.split(new RegExp(`(${words.map(escapeRegExp).join('|')})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded-sm bg-violet-100 px-0.5 text-inherit">
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  )
}

function ArticleForm({
  article,
  onClose,
  onSaved,
  knownCategories,
}: {
  article: Article | null
  onClose: () => void
  onSaved: () => void
  knownCategories: string[]
}) {
  const toast = useToast()
  const [form, setForm] = useState<ArticleInput>({
    question: article?.question ?? '',
    answer: article?.answer ?? '',
    category: article?.category ?? knownCategories[0] ?? CATEGORIES[0],
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [details, setDetails] = useState<string[]>([])
  const options = Array.from(new Set([...CATEGORIES, ...knownCategories, form.category]))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (article) await api.knowledge.update(article.id, form)
      else await api.knowledge.create(form)
      toast.success(article ? 'Статья сохранена' : 'Статья добавлена')
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось сохранить статью')
      setDetails(err instanceof ApiError ? err.errors : [])
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={article ? 'Редактировать статью' : 'Новая статья'}
      description="Коротко сформулируйте вопрос клиента и дайте понятный ответ."
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" type="submit" form="article-form" loading={saving}>
            {article ? 'Сохранить' : 'Добавить статью'}
          </Button>
        </>
      }
    >
      <form id="article-form" onSubmit={submit} className="space-y-4">
        <FormError message={error} details={details} />
        <Field label="Вопрос">
          {(id) => (
            <Input
              id={id}
              required
              minLength={5}
              maxLength={300}
              autoFocus
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              placeholder="Например: как сбросить пароль?"
            />
          )}
        </Field>
        <Field label="Ответ">
          {(id) => (
            <Textarea
              id={id}
              required
              minLength={5}
              rows={6}
              value={form.answer}
              onChange={(e) => setForm({ ...form, answer: e.target.value })}
              placeholder="Пошаговый ответ, который можно отправить клиенту"
            />
          )}
        </Field>
        <Field label="Категория">
          {(id) => (
            <Select id={id} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {options.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          )}
        </Field>
      </form>
    </Modal>
  )
}

export default function Knowledge() {
  const toast = useToast()
  const [search, setSearch] = useState('')
  const q = useDebounced(search, 250)
  const [category, setCategory] = useState('')
  const [openId, setOpenId] = useState<number | null>(null)
  const [editing, setEditing] = useState<Article | 'new' | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [copied, setCopied] = useState<number | null>(null)

  const list = useAsync(() => api.knowledge.list(q, category), [q, category])
  const cats = useAsync(() => api.knowledge.categories(), [])
  const total = cats.data?.reduce((sum, c) => sum + c.count, 0)

  const reloadAll = () => {
    list.reload()
    cats.reload()
  }

  const copy = async (article: Article) => {
    try {
      await navigator.clipboard.writeText(article.answer)
      setCopied(article.id)
      window.setTimeout(() => setCopied((c) => (c === article.id ? null : c)), 1800)
    } catch {
      toast.error('Не удалось скопировать. Выделите текст вручную.')
    }
  }

  const remove = async (article: Article) => {
    try {
      await api.knowledge.remove(article.id)
      toast.success('Статья удалена')
      setDeleting(null)
      reloadAll()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Не удалось удалить статью')
    }
  }

  const items = list.data ?? []

  return (
    <>
      <PageHeader
        title="База знаний"
        subtitle="Готовые ответы на частые вопросы. Операторы используют их в переписке, а AI-помощник будет опираться на них."
        actions={
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>
            Добавить статью
          </Button>
        }
      />

      <div className="panel mb-5 p-3 sm:p-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Найти ответ: например, пароль, оплата, Telegram" className="w-full" />
        <div className="scroll-x mt-3 flex gap-2 overflow-x-auto pb-0.5" role="group" aria-label="Категории">
          {[{ name: '', count: total }, ...(cats.data ?? [])].map((c) => {
            const active = c.name === category
            return (
              <button
                key={c.name || 'all'}
                onClick={() => setCategory(c.name)}
                aria-pressed={active}
                className={cx(
                  'flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors',
                  active
                    ? 'border-cobalt-600 bg-cobalt-600 text-white'
                    : 'border-line-strong bg-white text-body hover:border-cobalt-300 hover:text-ink',
                )}
              >
                {c.name || 'Все статьи'}
                {c.count !== undefined && (
                  <span className={cx('tnum text-xs', active ? 'text-white/80' : 'text-muted')}>{c.count}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {list.error && !list.data ? (
        <div className="panel">
          <ErrorState message={list.error} onRetry={list.reload} />
        </div>
      ) : !list.data ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="panel">
          {q || category ? (
            <EmptyState
              icon={<SearchX className="size-5" />}
              title="Ничего не найдено"
              text="Попробуйте другое слово или добавьте новую статью с ответом."
              action={
                <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>
                  Добавить статью
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<BookOpen className="size-5" />}
              title="База знаний пуста"
              text="Добавьте первый вопрос и ответ, чтобы операторы могли отвечать быстрее."
              action={
                <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>
                  Добавить статью
                </Button>
              }
            />
          )}
        </div>
      ) : (
        <>
          <p className="mb-3 text-[13px] text-muted" aria-live="polite">
            Найдено {items.length} {plural(items.length, ['статья', 'статьи', 'статей'])}
          </p>
          <ul className={cx('panel divide-y divide-line overflow-hidden transition-opacity', list.loading && 'opacity-60')}>
            {items.map((article) => {
              const open = openId === article.id || Boolean(q.trim() && items.length <= 3)
              return (
                <li key={article.id}>
                  <button
                    onClick={() => setOpenId(openId === article.id ? null : article.id)}
                    aria-expanded={open}
                    className="flex w-full items-start gap-4 px-4 py-4 text-left transition-colors hover:bg-mist/60 sm:px-6"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-medium text-ink">
                        <Highlight text={article.question} query={q} />
                      </span>
                      {!open && (
                        <span className="mt-1 block truncate text-[13px] text-muted">{article.answer}</span>
                      )}
                      <span className="mt-2 block">
                        <Tag>{article.category}</Tag>
                      </span>
                    </span>
                    <ChevronDown
                      className={cx('mt-1 size-5 shrink-0 text-muted transition-transform duration-300 ease-quint', open && 'rotate-180')}
                      aria-hidden
                    />
                  </button>
                  <div
                    className={cx(
                      'grid transition-[grid-template-rows] duration-300 ease-quint',
                      open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                    )}
                  >
                    <div className="overflow-hidden" inert={!open}>
                      <div className="px-4 pb-5 sm:px-6">
                        <p className="max-w-[68ch] text-[15px] leading-relaxed whitespace-pre-wrap text-body">
                          <Highlight text={article.answer} query={q} />
                        </p>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <Button size="sm" icon={copied === article.id ? <Check className="size-4 text-ok-600" /> : <Copy className="size-4" />} onClick={() => void copy(article)}>
                            {copied === article.id ? 'Скопировано' : 'Копировать ответ'}
                          </Button>
                          <Button size="sm" variant="ghost" icon={<Pencil className="size-4" />} onClick={() => setEditing(article)}>
                            Изменить
                          </Button>
                          {deleting === article.id ? (
                            <>
                              <Button size="sm" variant="danger" onClick={() => void remove(article)}>
                                Удалить навсегда
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setDeleting(null)}>
                                Отмена
                              </Button>
                            </>
                          ) : (
                            <Button size="sm" variant="ghost" icon={<Trash2 className="size-4" />} onClick={() => setDeleting(article.id)}>
                              Удалить
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {editing && (
        <ArticleForm
          article={editing === 'new' ? null : editing}
          knownCategories={(cats.data ?? []).map((c) => c.name)}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            reloadAll()
          }}
        />
      )}
    </>
  )
}
