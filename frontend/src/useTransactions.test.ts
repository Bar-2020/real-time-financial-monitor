import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Transaction } from './transaction'
import { FLUSH_INTERVAL_MS, RETRY_DELAY_MS, useTransactions } from './useTransactions'

const fake = vi.hoisted(() => ({
  handlers: {} as Record<string, (payload: unknown) => void>,
  onReconnecting: () => {},
  onReconnected: () => {},
  withUrlArgs: [] as unknown[],
  start: vi.fn<() => Promise<void>>(),
  stop: vi.fn(async () => {}),
}))

vi.mock('@microsoft/signalr', () => ({
  HttpTransportType: { WebSockets: 1 },
  HubConnectionBuilder: class {
    withUrl(...args: unknown[]) {
      fake.withUrlArgs = args
      return this
    }
    withAutomaticReconnect() {
      return this
    }
    build() {
      return {
        on: (name: string, handler: (payload: unknown) => void) => {
          fake.handlers[name] = handler
        },
        onreconnecting: (handler: () => void) => {
          fake.onReconnecting = handler
        },
        onreconnected: (handler: () => void) => {
          fake.onReconnected = handler
        },
        start: fake.start,
        stop: fake.stop,
      }
    }
  },
}))

const tx = (id: string, second = 0): Transaction => ({
  transactionId: id,
  amount: 10,
  currency: 'USD',
  status: 'Pending',
  timestamp: new Date(Date.UTC(2024, 0, 15, 10, 0, second)).toISOString(),
})

async function renderConnected() {
  const counter = { renders: 0 }
  const hook = renderHook(() => {
    counter.renders++
    return useTransactions()
  })
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0)
  })
  return { ...hook, counter }
}

describe('useTransactions', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    fake.start.mockReset().mockResolvedValue(undefined)
    fake.stop.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('connects directly over WebSockets so pods need no sticky sessions', async () => {
    await renderConnected()

    expect(fake.withUrlArgs).toEqual(['/hubs/transactions', { skipNegotiation: true, transport: 1 }])
  })

  it('reports live once connected', async () => {
    const { result } = await renderConnected()

    expect(result.current.connection).toBe('live')
  })

  it('turns a burst of 100 messages into a single state update', async () => {
    const { result, counter } = await renderConnected()
    const before = counter.renders

    act(() => {
      for (let i = 0; i < 100; i++) fake.handlers.transaction(tx(`id-${i}`))
    })
    expect(counter.renders).toBe(before)
    expect(result.current.rows).toHaveLength(0)

    act(() => {
      vi.advanceTimersByTime(FLUSH_INTERVAL_MS)
    })
    expect(counter.renders).toBe(before + 1)
    expect(result.current.rows).toHaveLength(100)
  })

  it('does not re-render when nothing has arrived', async () => {
    const { counter } = await renderConnected()
    const before = counter.renders

    act(() => {
      vi.advanceTimersByTime(FLUSH_INTERVAL_MS * 10)
    })

    expect(counter.renders).toBe(before)
  })

  it('shows the snapshot newest first without animating it', async () => {
    const { result } = await renderConnected()

    act(() => fake.handlers.snapshot([tx('newest', 2), tx('oldest', 1)]))

    expect(result.current.rows.map((row) => row.transactionId)).toEqual(['newest', 'oldest'])
    expect(result.current.rows.every((row) => !row.animate)).toBe(true)
  })

  it('merges a reconnect snapshot with rows already on screen', async () => {
    const { result } = await renderConnected()
    act(() => fake.handlers.snapshot([tx('a', 1)]))

    act(() => fake.handlers.snapshot([tx('b', 2), tx('a', 1)]))

    expect(result.current.rows.map((row) => row.transactionId)).toEqual(['b', 'a'])
  })

  it('keeps retrying when the first connection fails', async () => {
    fake.start.mockRejectedValueOnce(new Error('API is down'))
    const { result } = await renderConnected()
    expect(result.current.connection).toBe('connecting')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS)
    })

    expect(fake.start).toHaveBeenCalledTimes(2)
    expect(result.current.connection).toBe('live')
  })

  it('reports reconnecting while the connection is down', async () => {
    const { result } = await renderConnected()

    act(() => fake.onReconnecting())
    expect(result.current.connection).toBe('reconnecting')

    act(() => fake.onReconnected())
    expect(result.current.connection).toBe('live')
  })

  it('opens no connection when unmounted straight away, as StrictMode does', () => {
    const { unmount } = renderHook(() => useTransactions())

    unmount()
    vi.advanceTimersByTime(RETRY_DELAY_MS)

    expect(fake.start).not.toHaveBeenCalled()
  })

  it('stops the connection on unmount', async () => {
    const { unmount } = await renderConnected()

    unmount()

    expect(fake.stop).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })
})
