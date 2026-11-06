import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BURST_SIZE, STATUS_FOLLOW_UP_MS } from '../../constants'
import type { Transaction } from '../../types'
import { AddPage } from './AddPage'

const fetchMock = vi.fn<typeof fetch>()

const sentBodies = () =>
  fetchMock.mock.calls.map(([, options]) => JSON.parse(options?.body as string) as Transaction)

async function click(name: string) {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }))
  })
}

async function advance(milliseconds: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds)
  })
}

describe('AddPage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    fetchMock.mockReset().mockResolvedValue(new Response(null, { status: 202 }))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('posts one Pending transaction as JSON to the API', async () => {
    render(<AddPage />)

    await click('Send 1')

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/transactions')
    expect(options?.method).toBe('POST')
    expect(new Headers(options?.headers).get('Content-Type')).toBe('application/json')
    expect(sentBodies()[0].status).toBe('Pending')
  })

  it(`posts ${BURST_SIZE} different transactions for a burst`, async () => {
    render(<AddPage />)

    await click(`Send ${BURST_SIZE}`)

    expect(new Set(sentBodies().map((transaction) => transaction.transactionId)).size).toBe(BURST_SIZE)
  })

  it('follows up with a final status and later timestamp for the same id', async () => {
    render(<AddPage />)
    await click('Send 1')
    await advance(STATUS_FOLLOW_UP_MS - 1)
    expect(fetchMock).toHaveBeenCalledOnce()

    await advance(1)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const [pending, settled] = sentBodies()
    expect(settled.transactionId).toBe(pending.transactionId)
    expect(['Completed', 'Failed']).toContain(settled.status)
    expect(Date.parse(settled.timestamp)).toBeGreaterThan(Date.parse(pending.timestamp))
  })

  it('still sends the follow-up after leaving the page', async () => {
    const { unmount } = render(<AddPage />)
    await click('Send 1')

    unmount()
    await advance(STATUS_FOLLOW_UP_MS)

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('counts accepted posts', async () => {
    render(<AddPage />)

    await click('Send 1')

    expect(screen.getByRole('status').textContent).toMatch(/accepted: 1\b.*failed: 0\b/i)
  })

  it('shows an error and counts it when the API rejects a post', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 400 }))
    render(<AddPage />)

    await click('Send 1')

    expect(screen.getByRole('alert').textContent).toContain('400')
    expect(screen.getByRole('status').textContent).toMatch(/accepted: 0\b.*failed: 1\b/i)
  })

  it('does not follow up on a transaction that was rejected', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 400 }))
    render(<AddPage />)

    await click('Send 1')
    await advance(STATUS_FOLLOW_UP_MS)

    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('shows an error when the API cannot be reached', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    render(<AddPage />)

    await click('Send 1')

    expect(screen.getByRole('alert').textContent).toContain('Failed to fetch')
  })
})
