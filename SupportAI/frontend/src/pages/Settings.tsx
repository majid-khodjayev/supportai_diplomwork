import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { RotateCcw } from 'lucide-react'
import { api, ApiError } from '../api/client'
import type { Priority, Settings as SettingsData } from '../api/types'
import { Button } from '../components/ui/Button'
import { Field, FormError, Input, Select, Textarea, Toggle } from '../components/ui/Form'
import { Modal } from '../components/ui/Overlay'
import { ErrorState, PageHeader, Skeleton } from '../components/ui/Misc'
import { useShell } from '../context/ShellContext'
import { useToast } from '../context/ToastContext'
import { useAsync } from '../hooks/useAsync'
import { PRIORITY_META, PRIORITY_ORDER, TIMEZONES } from '../lib/constants'

type Editable = Omit<SettingsData, 'plan' | 'billing_period'>

const pick = (s: SettingsData): Editable => ({
  company_name: s.company_name,
  operator_name: s.operator_name,
  support_email: s.support_email,
  timezone: s.timezone,
  work_start: s.work_start,
  work_end: s.work_end,
  default_priority: s.default_priority,
  signature: s.signature,
  notify_new_ticket: s.notify_new_ticket,
  notify_urgent: s.notify_urgent,
  notify_daily_digest: s.notify_daily_digest,
})

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="grid gap-5 border-t border-line py-8 first:border-t-0 first:pt-0 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10">
      <div>
        <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

export default function Settings() {
  const { refresh } = useShell()
  const toast = useToast()
  const { data, error, reload } = useAsync(() => api.settings.get(), [])
  const [form, setForm] = useState<Editable | null>(null)
  const [saved, setSaved] = useState<Editable | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    if (data) {
      setForm(pick(data))
      setSaved(pick(data))
    }
  }, [data])

  if (error && !data) {
    return (
      <div className="panel">
        <ErrorState message={error} onRetry={reload} />
      </div>
    )
  }
  if (!form || !saved) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-16 max-w-md" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  const dirty = JSON.stringify(form) !== JSON.stringify(saved)
  const set = <K extends keyof Editable>(key: K, value: Editable[K]) => setForm({ ...form, [key]: value })

  const save = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      const updated = await api.settings.update(form)
      setSaved(pick(updated))
      setForm(pick(updated))
      toast.success('Настройки сохранены')
      refresh()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Не удалось сохранить настройки')
    } finally {
      setSaving(false)
    }
  }

  const resetDemo = async () => {
    setResetting(true)
    try {
      await api.settings.resetDemo()
      toast.success('Демонстрационные данные восстановлены')
      setResetOpen(false)
      refresh()
      reload()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Не удалось сбросить данные')
    } finally {
      setResetting(false)
    }
  }

  return (
    <>
      <PageHeader title="Настройки" subtitle="Данные компании, рабочее время и уведомления. Изменения применяются сразу после сохранения." />

      <form onSubmit={save} className="panel p-5 pb-3 sm:p-8 sm:pb-4">
        <Section title="Компания" description="Название и адрес, от имени которых вы отвечаете клиентам.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Название компании">
              {(id) => (
                <Input id={id} required minLength={2} value={form.company_name} onChange={(e) => set('company_name', e.target.value)} />
              )}
            </Field>
            <Field label="Email поддержки">
              {(id) => (
                <Input id={id} type="email" required value={form.support_email} onChange={(e) => set('support_email', e.target.value)} />
              )}
            </Field>
          </div>
        </Section>

        <Section title="Оператор" description="Это имя клиенты видят в ответах, а ещё оно показывается в шапке.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ваше имя">
              {(id) => (
                <Input id={id} required minLength={2} value={form.operator_name} onChange={(e) => set('operator_name', e.target.value)} />
              )}
            </Field>
            <Field label="Часовой пояс">
              {(id) => (
                <Select id={id} value={form.timezone} onChange={(e) => set('timezone', e.target.value)}>
                  {Array.from(new Set([...TIMEZONES, form.timezone])).map((tz) => (
                    <option key={tz}>{tz}</option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
        </Section>

        <Section title="Рабочее время" description="В это время поддержка отвечает клиентам.">
          <div className="grid max-w-md grid-cols-2 gap-4">
            <Field label="Начало">
              {(id) => <Input id={id} type="time" required value={form.work_start} onChange={(e) => set('work_start', e.target.value)} />}
            </Field>
            <Field label="Конец">
              {(id) => <Input id={id} type="time" required value={form.work_end} onChange={(e) => set('work_end', e.target.value)} />}
            </Field>
          </div>
        </Section>

        <Section title="Обращения" description="Значения по умолчанию для новых обращений и ответов.">
          <div className="grid gap-4">
            <Field label="Приоритет по умолчанию" className="max-w-xs">
              {(id) => (
                <Select id={id} value={form.default_priority} onChange={(e) => set('default_priority', e.target.value as Priority)}>
                  {[...PRIORITY_ORDER].reverse().map((p) => (
                    <option key={p} value={p}>
                      {PRIORITY_META[p].label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Подпись в ответах" hint="Вставляется кнопкой «Подпись» под полем ответа.">
              {(id) => <Textarea id={id} rows={3} maxLength={500} value={form.signature} onChange={(e) => set('signature', e.target.value)} />}
            </Field>
          </div>
        </Section>

        <Section title="Уведомления" description="О чём сообщать вам и команде.">
          <div className="divide-y divide-line">
            <Toggle
              label="Новое обращение"
              description="Сообщать, когда клиент создаёт обращение"
              checked={form.notify_new_ticket}
              onChange={(v) => set('notify_new_ticket', v)}
            />
            <Toggle
              label="Срочные обращения"
              description="Отдельное уведомление для срочных и высоких приоритетов"
              checked={form.notify_urgent}
              onChange={(v) => set('notify_urgent', v)}
            />
            <Toggle
              label="Ежедневная сводка"
              description="Итоги дня на почту поддержки"
              checked={form.notify_daily_digest}
              onChange={(v) => set('notify_daily_digest', v)}
            />
          </div>
          <p className="mt-3 text-xs text-muted">Отправка уведомлений подключится вместе с интеграциями. Выбор сохраняется уже сейчас.</p>
        </Section>

        <Section title="Данные" description="Служебные действия для демонстрации проекта.">
          <div className="flex flex-col gap-3 rounded-control border border-line bg-mist/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-ink">Вернуть демонстрационные данные</p>
              <p className="mt-0.5 text-[13px] text-muted">Все текущие обращения, статьи и настройки будут заменены исходным набором.</p>
            </div>
            <Button variant="danger" icon={<RotateCcw className="size-4" />} onClick={() => setResetOpen(true)}>
              Сбросить данные
            </Button>
          </div>
        </Section>

        {/* Панель сохранения закреплена внизу экрана, пока есть несохранённые изменения */}
        <div
          className={`sticky bottom-3 z-20 -mx-1 mt-2 transition-all duration-300 ease-quint sm:bottom-5 ${
            dirty ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
          }`}
          aria-hidden={!dirty}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-line bg-white px-4 py-3 shadow-pop">
            <div className="min-w-0 text-sm">
              {formError ? <FormError message={formError} /> : <span className="text-body">Есть несохранённые изменения</span>}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" tabIndex={dirty ? 0 : -1} onClick={() => { setForm(saved); setFormError(null) }}>
                Отменить
              </Button>
              <Button variant="primary" type="submit" tabIndex={dirty ? 0 : -1} loading={saving}>
                Сохранить
              </Button>
            </div>
          </div>
        </div>
      </form>

      {resetOpen && (
        <Modal
          title="Вернуть демонстрационные данные?"
          description="Это действие нельзя отменить."
          onClose={() => setResetOpen(false)}
          width="max-w-md"
          footer={
            <>
              <Button variant="ghost" onClick={() => setResetOpen(false)}>
                Отмена
              </Button>
              <Button variant="danger" loading={resetting} onClick={() => void resetDemo()}>
                Да, сбросить
              </Button>
            </>
          }
        >
          <p className="text-sm text-body">
            Новые обращения, добавленные статьи и изменённые настройки будут удалены, а база вернётся к исходному набору для демонстрации.
          </p>
        </Modal>
      )}
    </>
  )
}
