import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { api, ApiError } from '../api/client'
import type { Channel, Customer, NewTicket, Priority } from '../api/types'
import { useShell } from '../context/ShellContext'
import { useToast } from '../context/ToastContext'
import { CATEGORIES, CHANNEL_LABEL, CHANNEL_ORDER, PRIORITY_META, PRIORITY_ORDER } from '../lib/constants'
import { Button } from './ui/Button'
import { Field, FormError, Input, Select, Textarea } from './ui/Form'
import { Modal } from './ui/Overlay'
import { Segmented } from './ui/Misc'

interface Props {
  onClose: () => void
  onCreated: (ticketId: number) => void
}

export function NewTicketModal({ onClose, onCreated }: Props) {
  const { settings } = useShell()
  const toast = useToast()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [form, setForm] = useState<NewTicket>({
    subject: '',
    customer_name: '',
    customer_email: '',
    customer_company: '',
    priority: settings?.default_priority ?? 'medium',
    channel: 'email',
    category: CATEGORIES[0],
    message: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [details, setDetails] = useState<string[]>([])

  // Существующие клиенты нужны для подсказки при вводе email.
  useEffect(() => {
    api.customers.list().then(setCustomers).catch(() => setCustomers([]))
  }, [])

  const known = useMemo(
    () => customers.find((c) => c.email.toLowerCase() === form.customer_email.trim().toLowerCase()),
    [customers, form.customer_email],
  )

  const set = <K extends keyof NewTicket>(key: K, value: NewTicket[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const onEmail = (value: string) => {
    const match = customers.find((c) => c.email.toLowerCase() === value.trim().toLowerCase())
    setForm((prev) => ({
      ...prev,
      customer_email: value,
      ...(match ? { customer_name: match.name, customer_company: match.company ?? '' } : {}),
    }))
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setDetails([])
    try {
      const created = await api.tickets.create({
        ...form,
        customer_company: form.customer_company?.trim() || undefined,
      })
      toast.success(`Обращение ${created.code} создано`)
      onCreated(created.id)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        setDetails(err.errors)
      } else {
        setError('Не удалось создать обращение')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="Новое обращение"
      description="Зафиксируйте запрос клиента — он появится в списке сразу после создания."
      onClose={onClose}
      width="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" type="submit" form="new-ticket-form" loading={saving}>
            Создать обращение
          </Button>
        </>
      }
    >
      <form id="new-ticket-form" onSubmit={submit} className="space-y-4">
        <FormError message={error} details={details} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Email клиента"
            hint={known ? `Клиент уже в базе: ${known.name}` : 'Если клиент уже есть, данные подставятся сами'}
          >
            {(id) => (
              <Input
                id={id}
                type="email"
                required
                autoFocus
                list="known-customers"
                value={form.customer_email}
                onChange={(e) => onEmail(e.target.value)}
                placeholder="name@company.com"
              />
            )}
          </Field>
          <datalist id="known-customers">
            {customers.map((c) => (
              <option key={c.id} value={c.email}>
                {c.name}
              </option>
            ))}
          </datalist>
          <Field label="Имя клиента">
            {(id) => (
              <Input
                id={id}
                required
                minLength={2}
                value={form.customer_name}
                onChange={(e) => set('customer_name', e.target.value)}
                placeholder="Анна Петрова"
              />
            )}
          </Field>
        </div>

        <Field label="Компания" hint="Необязательно">
          {(id) => (
            <Input
              id={id}
              value={form.customer_company ?? ''}
              onChange={(e) => set('customer_company', e.target.value)}
              placeholder="Название компании клиента"
            />
          )}
        </Field>

        <Field label="Тема обращения">
          {(id) => (
            <Input
              id={id}
              required
              minLength={3}
              maxLength={200}
              value={form.subject}
              onChange={(e) => set('subject', e.target.value)}
              placeholder="Например: не приходит письмо для сброса пароля"
            />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Категория">
            {(id) => (
              <Select id={id} value={form.category} onChange={(e) => set('category', e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Канал">
            {(id) => (
              <Select id={id} value={form.channel} onChange={(e) => set('channel', e.target.value as Channel)}>
                {CHANNEL_ORDER.map((c) => (
                  <option key={c} value={c}>
                    {CHANNEL_LABEL[c]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-ink">Приоритет</span>
          <Segmented<Priority>
            label="Приоритет"
            value={form.priority}
            onChange={(value) => set('priority', value)}
            options={[...PRIORITY_ORDER].reverse().map((p) => ({ value: p, label: PRIORITY_META[p].label }))}
          />
        </div>

        <Field label="Сообщение клиента">
          {(id) => (
            <Textarea
              id={id}
              required
              minLength={3}
              rows={4}
              value={form.message}
              onChange={(e) => set('message', e.target.value)}
              placeholder="Опишите, что произошло и что нужно клиенту"
            />
          )}
        </Field>
      </form>
    </Modal>
  )
}
