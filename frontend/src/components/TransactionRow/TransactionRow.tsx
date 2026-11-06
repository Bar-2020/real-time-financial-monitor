import { memo } from 'react'
import type { Row } from '../../types'
import './TransactionRow.css'

// Intl formatters are slow to create and rows render in bursts, so each one is created once.
const timeFormat = new Intl.DateTimeFormat(undefined, { timeStyle: 'medium' })
const amountFormats = new Map<string, Intl.NumberFormat>()

function formatAmount(amount: number, currency: string) {
  let amountFormat = amountFormats.get(currency)
  if (!amountFormat) {
    amountFormat = new Intl.NumberFormat(undefined, { style: 'currency', currency })
    amountFormats.set(currency, amountFormat)
  }
  return amountFormat.format(amount)
}

export const TransactionRow = memo(function TransactionRow({ row }: { row: Row }) {
  return (
    <tr className={row.animate ? 'row-enter' : undefined}>
      <td title={row.transactionId}>{row.transactionId.slice(0, 8)}</td>
      <td className="transaction-amount">{formatAmount(row.amount, row.currency)}</td>
      <td>
        <span className={`badge badge-${row.status.toLowerCase()}`}>{row.status}</span>
      </td>
      <td>{timeFormat.format(new Date(row.timestamp))}</td>
    </tr>
  )
})
