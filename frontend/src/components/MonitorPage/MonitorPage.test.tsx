import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTransactions } from '../../hooks/useTransactions'
import type { ConnectionState, DisplayedTransaction, Transaction } from '../../types'
import { MonitorPage } from './MonitorPage'

vi.mock('../../hooks/useTransactions', () => ({ useTransactions: vi.fn() }))

const makeRow = (id: string, status: Transaction['status']): DisplayedTransaction => ({
  transactionId: id,
  amount: 1500.5,
  currency: 'USD',
  status,
  timestamp: '2024-01-15T10:00:00.000Z',
  animate: false,
})

const rows = [
  makeRow('pending-1', 'Pending'),
  makeRow('completed-1', 'Completed'),
  makeRow('failed-1', 'Failed'),
  makeRow('failed-2', 'Failed'),
]

const bodyRows = () => screen.getAllByRole('row').slice(1)

function show(displayedRows: DisplayedTransaction[], connection: ConnectionState = 'live') {
  vi.mocked(useTransactions).mockReturnValue({ rows: displayedRows, connection })
  render(<MonitorPage />)
}

describe('MonitorPage', () => {
  beforeEach(() => {
    vi.mocked(useTransactions).mockReset()
  })

  it('renders a row for each transaction', () => {
    show(rows)

    expect(bodyRows()).toHaveLength(rows.length)
  })

  it('filters to one status and back to all', () => {
    show(rows)

    fireEvent.click(screen.getByRole('button', { name: 'Failed' }))
    expect(bodyRows()).toHaveLength(2)
    expect(bodyRows().every((tableRow) => within(tableRow).queryByText('Failed'))).toBe(true)
    expect(screen.getByRole('button', { name: 'Failed' }).getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(bodyRows()).toHaveLength(rows.length)
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
    show([makeRow('pending-1', 'Pending')])

    fireEvent.click(screen.getByRole('button', { name: 'Failed' }))

    expect(screen.getByText(/no transactions/i)).toBeTruthy()
  })
})
