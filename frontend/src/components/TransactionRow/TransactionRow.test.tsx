import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { DisplayedTransaction } from '../../types'
import { TransactionRow } from './TransactionRow'

const row: DisplayedTransaction = {
  transactionId: '3f2b8c1e-5d4a-4e6f-9a7b-1c2d3e4f5a6b',
  amount: 1500.5,
  currency: 'USD',
  status: 'Pending',
  timestamp: '2024-01-15T10:00:00.000Z',
  animate: false,
}

const renderRow = (overrides: Partial<DisplayedTransaction> = {}) =>
  render(
    <table>
      <tbody>
        <TransactionRow row={{ ...row, ...overrides }} />
      </tbody>
    </table>,
  )

describe('TransactionRow', () => {
  it('shows a short id with the full id as its title', () => {
    renderRow()

    expect(screen.getByText('3f2b8c1e').getAttribute('title')).toBe(row.transactionId)
  })

  it('formats the amount in its currency', () => {
    renderRow()

    expect(screen.getByText(/1,500\.50/)).toBeTruthy()
  })

  it.each([
    ['Pending', 'badge-pending'],
    ['Completed', 'badge-completed'],
    ['Failed', 'badge-failed'],
  ] as const)('shows %s as text with its own badge colour', (status, badgeClass) => {
    renderRow({ status })

    expect(screen.getByText(status).className).toContain(badgeClass)
  })

  it('animates a live arrival', () => {
    renderRow({ animate: true })

    expect(screen.getByRole('row').className).toContain('row-enter')
  })

  it('does not animate a row loaded from history', () => {
    renderRow({ animate: false })

    expect(screen.getByRole('row').className).not.toContain('row-enter')
  })
})
