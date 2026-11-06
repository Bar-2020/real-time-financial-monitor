import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MonitorPage } from './MonitorPage'
import type { Row, Transaction } from './transaction'
import { useTransactions } from './useTransactions'

vi.mock('./useTransactions', () => ({ useTransactions: vi.fn() }))

const row = (id: string, status: Transaction['status'], animate = false): Row => ({
  transactionId: id,
  amount: 1500.5,
  currency: 'USD',
  status,
  timestamp: '2024-01-15T10:00:00.000Z',
  animate,
})

const rows = [
  row('pending-1', 'Pending'),
  row('completed-1', 'Completed'),
  row('failed-1', 'Failed'),
  row('failed-2', 'Failed'),
]

const bodyRows = () => screen.getAllByRole('row').slice(1)

function show(data: Row[], connection: ReturnType<typeof useTransactions>['connection'] = 'live') {
  vi.mocked(useTransactions).mockReturnValue({ rows: data, connection })
  render(<MonitorPage />)
}

describe('MonitorPage', () => {
  beforeEach(() => {
    vi.mocked(useTransactions).mockReset()
  })

  it('renders a row for each transaction', () => {
    show(rows)

    expect(bodyRows()).toHaveLength(rows.length)
    expect(within(bodyRows()[0]).getByText('pending-1'.slice(0, 8))).toBeTruthy()
    expect(within(bodyRows()[0]).getByText(/1,500\.50/)).toBeTruthy()
  })

  it('gives each status its own badge colour and shows the status as text', () => {
    show(rows)

    expect(within(bodyRows()[0]).getByText('Pending').className).toContain('badge-pending')
    expect(within(bodyRows()[1]).getByText('Completed').className).toContain('badge-completed')
    expect(within(bodyRows()[2]).getByText('Failed').className).toContain('badge-failed')
  })

  it('filters to one status and back to all', () => {
    show(rows)

    fireEvent.click(screen.getByRole('button', { name: 'Failed' }))
    expect(bodyRows()).toHaveLength(2)
    expect(bodyRows().every((tr) => within(tr).queryByText('Failed'))).toBe(true)
    expect(screen.getByRole('button', { name: 'Failed' }).getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(bodyRows()).toHaveLength(rows.length)
  })

  it('animates only rows marked as live arrivals', () => {
    show([row('live-row', 'Pending', true), row('old-row', 'Pending', false)])

    expect(bodyRows()[0].className).toContain('row-enter')
    expect(bodyRows()[1].className).not.toContain('row-enter')
  })

  it.each([
    ['live', 'Live'],
    ['connecting', 'Connecting'],
    ['reconnecting', 'Reconnecting'],
  ] as const)('shows the %s connection state', (connection, label) => {
    show([], connection)

    expect(screen.getByRole('status').textContent).toContain(label)
  })

  it('explains an empty list', () => {
    show([])

    expect(screen.getByText(/no transactions/i)).toBeTruthy()
  })

  it('explains when a filter matches nothing', () => {
    show([row('pending-1', 'Pending')])

    fireEvent.click(screen.getByRole('button', { name: 'Failed' }))

    expect(screen.getByText(/no transactions/i)).toBeTruthy()
  })
})
