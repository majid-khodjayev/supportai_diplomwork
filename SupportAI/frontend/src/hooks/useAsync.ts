import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react'

interface AsyncState<T> {
  data: T | null
  error: string | null
  loading: boolean
}

/**
 * Загружает данные с backend.
 *  - data    — последний успешный результат (остаётся на экране, пока грузится новый)
 *  - error   — понятный текст ошибки
 *  - loading — идёт ли загрузка
 *  - reload  — перезагрузить вручную
 * Загрузка повторяется при изменении значений в deps.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList) {
  const [state, setState] = useState<AsyncState<T>>({ data: null, error: null, loading: true })
  const [tick, setTick] = useState(0)
  const latest = useRef(0)

  useEffect(() => {
    const id = ++latest.current
    setState((prev) => ({ ...prev, loading: true, error: null }))
    fn()
      .then((data) => {
        if (id === latest.current) setState({ data, error: null, loading: false })
      })
      .catch((err: unknown) => {
        if (id === latest.current) {
          setState((prev) => ({
            data: prev.data,
            error: err instanceof Error ? err.message : 'Не удалось загрузить данные',
            loading: false,
          }))
        }
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { ...state, reload }
}

/** Значение с задержкой — чтобы не отправлять запрос на каждую набранную букву. */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return debounced
}

/** Плавный счётчик для цифр на дашборде (отключается при prefers-reduced-motion). */
export function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(target)
  const first = useRef(true)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || !first.current) {
      setValue(target)
      return
    }
    first.current = false
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 4)
      setValue(target * eased)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    setValue(0)
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])

  return value
}
